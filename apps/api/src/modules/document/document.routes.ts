import type { FastifyPluginAsync } from "fastify";
import {
  createDocumentHandler,
  deleteDocumentHandler,
  getClientsHandler,
  getDocumentByIdHandler,
  getDocumentStatsHandler,
  getDocumentsHandler,
  updateDocumentHandler,
  getDocumentExpiryNotificationsHandler,
  markNotificationReadHandler,
} from "./document.controller.js";

export const documentRoutes: FastifyPluginAsync = async (fastify) => {
  // 1. Create a new document for an organisation (stores Bunny CDN URL, schedules 7, 3, 1-day reminders)
  fastify.post("/", createDocumentHandler);

  // 2. List documents with pagination, filters (documentType, status, expiringInDays), and text search
  fastify.get("/", getDocumentsHandler);

  // 3. Organisation document metrics (total, active, expiring in 30/7/3/1 days, expired)
  fastify.get("/stats", getDocumentStatsHandler);

  // 4. Client / Assigned person list for the organisation (to populate the "Select client" dropdown)
  fastify.get("/clients", getClientsHandler);

  // 5. Expiry Check & System Notifications (7, 3, 1 days before expiry)
  fastify.get("/notifications", getDocumentExpiryNotificationsHandler);
  fastify.get("/expiry-check", getDocumentExpiryNotificationsHandler);
  fastify.patch("/notifications/:id/read", markNotificationReadHandler);

  // 6. Nested organisation convenience routes
  fastify.get("/organisation/:organisationId", async (request, reply) => {
    const { organisationId } = request.params as { organisationId: string };
    (request.query as any).organisationId = organisationId;
    return getDocumentsHandler(request, reply);
  });

  fastify.get("/organisation/:organisationId/stats", async (request, reply) => {
    const { organisationId } = request.params as { organisationId: string };
    (request.query as any).organisationId = organisationId;
    return getDocumentStatsHandler(request as any, reply);
  });

  fastify.get("/organisation/:organisationId/clients", async (request, reply) => {
    const { organisationId } = request.params as { organisationId: string };
    (request.query as any).organisationId = organisationId;
    return getClientsHandler(request as any, reply);
  });

  fastify.get("/organisation/:organisationId/notifications", async (request, reply) => {
    const { organisationId } = request.params as { organisationId: string };
    (request.query as any).organisationId = organisationId;
    return getDocumentExpiryNotificationsHandler(request as any, reply);
  });

  // 7. Single document operations
  fastify.get("/:id", getDocumentByIdHandler);
  fastify.patch("/:id", updateDocumentHandler);
  fastify.delete("/:id", deleteDocumentHandler);
};
