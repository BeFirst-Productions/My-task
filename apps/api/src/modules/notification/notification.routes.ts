import type { FastifyPluginAsync } from "fastify";
import {
  getNotificationsHandler,
  getNotificationByIdHandler,
  updateNotificationStatusHandler,
  resendNotificationHandler,
} from "./notification.controller.js";

export const notificationRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/notifications - List notifications with search, filters, and dynamic metrics
  fastify.get("/", getNotificationsHandler);

  // GET /api/notifications/:id - Single notification
  fastify.get("/:id", getNotificationByIdHandler);

  // PATCH /api/notifications/:id/status - Update status
  fastify.patch("/:id/status", updateNotificationStatusHandler);

  // POST /api/notifications/:id/resend - Resend notification
  fastify.post("/:id/resend", resendNotificationHandler);
};

