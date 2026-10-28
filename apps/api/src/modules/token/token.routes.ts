import type { FastifyInstance } from "fastify";
import {
  createTokenHandler,
  getOrganisationTokensHandler,
  getPlatformTokensHandler,
  getTokenDetailsHandler,
  updateTokenStatusHandler,
  addTokenMessageHandler,
  getDomainStatusHandler,
  getSystemNotificationsHandler,
  markNotificationReadHandler,
  markAllNotificationsReadHandler,
} from "./token.controller.js";

export async function tokenRoutes(fastify: FastifyInstance) {
  // Token creation
  fastify.post("/", createTokenHandler);

  // Organisation token list
  fastify.get("/organisation/:idOrSubdomain", getOrganisationTokensHandler);

  // Platform all tokens list
  fastify.get("/platform", getPlatformTokensHandler);

  // Single token details & message thread
  fastify.get("/:id", getTokenDetailsHandler);

  // Update token status (Approve, Reject, Resolve, etc.)
  fastify.patch("/:id/status", updateTokenStatusHandler);

  // Append message to token
  fastify.post("/:id/messages", addTokenMessageHandler);

  // Domain edit authorization status
  fastify.get("/domain-status/:idOrSubdomain", getDomainStatusHandler);

  // System Notifications
  fastify.get("/notifications/system", getSystemNotificationsHandler);
  fastify.patch("/notifications/system/:id/read", markNotificationReadHandler);
  fastify.post("/notifications/system/read-all", markAllNotificationsReadHandler);
}
