import type { FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import {
  createOrganisationSchema,
  organisationQuerySchema,
  updateOrganisationSchema,
} from "./organization.schema.js";
import {
  createOrganisation,
  getOrganisations,
  getOrganisationById,
  updateOrganisation,
  updateOrganisationStatus,
  deleteOrganisation,
} from "./organization.service.js";

/**
 * POST /api/organisations
 * Registers a new organisation with Super Admin credentials and notification settings
 */
export async function createOrganisationHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const validatedData = createOrganisationSchema.parse(request.body);
    const result = await createOrganisation(validatedData);

    return reply.status(201).send({
      success: true,
      message: "Organisation and Super Admin account created successfully.",
      data: result,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return reply.status(400).send({
        success: false,
        error: "ValidationError",
        message: "Invalid organisation input data",
        details: error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    const message = error instanceof Error ? error.message : "Failed to create organisation";
    const isConflict = message.includes("already exists");

    return reply.status(isConflict ? 409 : 500).send({
      success: false,
      error: isConflict ? "ConflictError" : "InternalServerError",
      message,
    });
  }
}

/**
 * GET /api/organisations
 * Lists organisations with pagination, status filter, and search
 */
export async function getOrganisationsHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const query = organisationQuerySchema.parse(request.query);
    const result = await getOrganisations(query);

    return reply.status(200).send({
      success: true,
      ...result,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return reply.status(400).send({
        success: false,
        error: "ValidationError",
        message: "Invalid query parameters",
        details: error.issues,
      });
    }

    return reply.status(500).send({
      success: false,
      error: "InternalServerError",
      message: error instanceof Error ? error.message : "Failed to fetch organisations",
    });
  }
}

/**
 * GET /api/organisations/:id
 * Retrieves single organisation details by ID
 */
export async function getOrganisationByIdHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const { id } = request.params;
    const organisation = await getOrganisationById(id);

    return reply.status(200).send({
      success: true,
      data: organisation,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Organisation not found";
    const isNotFound = message.includes("not found");

    return reply.status(isNotFound ? 404 : 500).send({
      success: false,
      error: isNotFound ? "NotFoundError" : "InternalServerError",
      message,
    });
  }
}

/**
 * PATCH /api/organisations/:id
 * Updates organisation details
 */
export async function updateOrganisationHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const { id } = request.params;
    const validatedData = updateOrganisationSchema.parse(request.body);
    const updated = await updateOrganisation(id, validatedData);

    return reply.status(200).send({
      success: true,
      message: "Organisation details updated successfully.",
      data: updated,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return reply.status(400).send({
        success: false,
        error: "ValidationError",
        message: "Invalid update data",
        details: error.issues,
      });
    }

    const message = error instanceof Error ? error.message : "Failed to update organisation";
    const isNotFound = message.includes("not found");

    return reply.status(isNotFound ? 404 : 500).send({
      success: false,
      error: isNotFound ? "NotFoundError" : "InternalServerError",
      message,
    });
  }
}

/**
 * PATCH /api/organisations/:id/status
 * Updates organisation status (ACTIVE, INACTIVE, SUSPENDED)
 */
export async function updateOrganisationStatusHandler(
  request: FastifyRequest<{
    Params: { id: string };
    Body: { status: "PENDING" | "ACTIVE" | "INACTIVE" | "SUSPENDED" };
  }>,
  reply: FastifyReply
) {
  try {
    const { id } = request.params;
    const { status } = request.body || {};

    if (!status || !["PENDING", "ACTIVE", "INACTIVE", "SUSPENDED"].includes(status)) {
      return reply.status(400).send({
        success: false,
        error: "ValidationError",
        message: "Valid status ('PENDING', 'ACTIVE', 'INACTIVE', 'SUSPENDED') is required.",
      });
    }

    const updated = await updateOrganisationStatus(id, status);

    return reply.status(200).send({
      success: true,
      message: `Organisation status updated to ${status}.`,
      data: updated,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update status";
    const isNotFound = message.includes("not found");

    return reply.status(isNotFound ? 404 : 500).send({
      success: false,
      error: isNotFound ? "NotFoundError" : "InternalServerError",
      message,
    });
  }
}

/**
 * DELETE /api/organisations/:id
 * Deletes an organisation
 */
export async function deleteOrganisationHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const { id } = request.params;
    const result = await deleteOrganisation(id);

    return reply.status(200).send({
      success: true,
      message: result.message,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete organisation";
    const isNotFound = message.includes("not found");

    return reply.status(isNotFound ? 404 : 500).send({
      success: false,
      error: isNotFound ? "NotFoundError" : "InternalServerError",
      message,
    });
  }
}
