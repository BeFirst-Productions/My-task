import type { FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import {
  createDocumentSchema,
  documentQuerySchema,
  updateDocumentSchema,
} from "./document.schema.js";
import {
  createDocument,
  deleteDocument,
  getClients,
  getDocumentById,
  getDocumentStats,
  getDocuments,
  updateDocument,
  checkAndSyncDocumentExpiryNotifications,
  markNotificationAsRead,
} from "./document.service.js";

/**
 * POST /api/documents
 * Registers a new document for an organisation, storing the Bunny CDN URL and scheduling 7, 3, 1-day reminders.
 */
export async function createDocumentHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const validatedData = createDocumentSchema.parse(request.body);
    const userContext = (request as any).user;

    const document = await createDocument(validatedData, userContext);

    return reply.status(201).send({
      success: true,
      message: "Document registered successfully.",
      data: document,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return reply.status(400).send({
        success: false,
        error: "ValidationError",
        message: "Invalid document input data",
        details: error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    const message = error instanceof Error ? error.message : "Failed to create document";
    return reply.status(400).send({
      success: false,
      error: "DocumentCreationError",
      message,
    });
  }
}

/**
 * GET /api/documents
 * Lists documents for an organisation with search, filters (type, status, expiringInDays), and pagination.
 */
export async function getDocumentsHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const query = documentQuerySchema.parse(request.query);

    const result = await getDocuments(query);

    return reply.status(200).send({
      success: true,
      data: result.documents,
      pagination: result.pagination,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return reply.status(400).send({
        success: false,
        error: "ValidationError",
        message: "Invalid document query parameters",
        details: error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    const message = error instanceof Error ? error.message : "Failed to fetch documents";
    return reply.status(400).send({
      success: false,
      error: "DocumentFetchError",
      message,
    });
  }
}

/**
 * GET /api/documents/:id
 * Fetches a single document by ID.
 */
export async function getDocumentByIdHandler(
  request: FastifyRequest<{ Params: { id: string }; Querystring: { organisationId?: string } }>,
  reply: FastifyReply
) {
  try {
    const { id } = request.params;
    const { organisationId } = request.query;

    const document = await getDocumentById(id, organisationId);

    return reply.status(200).send({
      success: true,
      data: document,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Document not found";
    return reply.status(404).send({
      success: false,
      error: "DocumentNotFoundError",
      message,
    });
  }
}

/**
 * PATCH /api/documents/:id
 * Updates an existing document and adjusts expiry notification schedules if needed.
 */
export async function updateDocumentHandler(
  request: FastifyRequest<{ Params: { id: string }; Querystring: { organisationId?: string } }>,
  reply: FastifyReply
) {
  try {
    const { id } = request.params;
    const { organisationId } = request.query;
    const validatedData = updateDocumentSchema.parse(request.body);

    const document = await updateDocument(id, validatedData, organisationId);

    return reply.status(200).send({
      success: true,
      message: "Document updated successfully.",
      data: document,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return reply.status(400).send({
        success: false,
        error: "ValidationError",
        message: "Invalid update data",
        details: error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    const message = error instanceof Error ? error.message : "Failed to update document";
    return reply.status(400).send({
      success: false,
      error: "DocumentUpdateError",
      message,
    });
  }
}

/**
 * DELETE /api/documents/:id
 * Removes a document and its scheduled notifications.
 */
export async function deleteDocumentHandler(
  request: FastifyRequest<{ Params: { id: string }; Querystring: { organisationId?: string } }>,
  reply: FastifyReply
) {
  try {
    const { id } = request.params;
    const { organisationId } = request.query;

    const result = await deleteDocument(id, organisationId);

    return reply.status(200).send({
      success: true,
      message: result.message,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete document";
    return reply.status(400).send({
      success: false,
      error: "DocumentDeletionError",
      message,
    });
  }
}

/**
 * GET /api/documents/stats
 * Returns document expiry and status counts for an organisation dashboard.
 */
export async function getDocumentStatsHandler(
  request: FastifyRequest<{ Querystring: { organisationId?: string } }>,
  reply: FastifyReply
) {
  try {
    const { organisationId } = request.query;
    const stats = await getDocumentStats(organisationId);

    return reply.status(200).send({
      success: true,
      data: stats,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch document stats";
    return reply.status(400).send({
      success: false,
      error: "DocumentStatsError",
      message,
    });
  }
}

/**
 * GET /api/documents/clients
 * Returns the client list for the organisation to populate the "Select client" dropdown.
 */
export async function getClientsHandler(
  request: FastifyRequest<{ Querystring: { organisationId?: string } }>,
  reply: FastifyReply
) {
  try {
    const { organisationId } = request.query;
    const clients = await getClients(organisationId);

    return reply.status(200).send({
      success: true,
      data: clients,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch clients";
    return reply.status(400).send({
      success: false,
      error: "ClientsFetchError",
      message,
    });
  }
}

/**
 * GET /api/documents/notifications
 * Checks all documents for expiry 7, 3, 1 days before, creates/syncs system notifications,
 * and returns live urgency-ranked notification alerts.
 */
export async function getDocumentExpiryNotificationsHandler(
  request: FastifyRequest<{ Querystring: { organisationId?: string } }>,
  reply: FastifyReply
) {
  try {
    const { organisationId } = request.query;
    const result = await checkAndSyncDocumentExpiryNotifications(organisationId);

    return reply.status(200).send({
      success: true,
      data: result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to check document expiry notifications";
    return reply.status(400).send({
      success: false,
      error: "ExpiryNotificationsError",
      message,
    });
  }
}

/**
 * PATCH /api/documents/notifications/:id/read
 * Marks an expiry reminder notification as read / dismissed.
 */
export async function markNotificationReadHandler(
  request: FastifyRequest<{
    Params: { id: string };
    Querystring: { organisationId?: string };
  }>,
  reply: FastifyReply
) {
  try {
    const { id } = request.params;
    const { organisationId } = request.query;
    await markNotificationAsRead(id, organisationId);

    return reply.status(200).send({
      success: true,
      message: "Notification marked as read.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to mark notification as read";
    return reply.status(400).send({
      success: false,
      error: "MarkNotificationError",
      message,
    });
  }
}

