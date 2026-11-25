import type { FastifyPluginAsync } from "fastify";
import {
  getMeHandler,
  loginHandler,
  seedHandler,
  updateAvailabilityHandler,
  updateSeatNumberHandler,
  toggleBreakHandler,
  getSeatsHandler,
  releaseSeatHandler,
} from "./auth.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  // Login with username/email and password
  fastify.post("/login", loginHandler);

  // Get current logged-in user session
  fastify.get("/me", getMeHandler);

  // Update online/offline availability for staff
  fastify.patch("/availability", { preHandler: [authenticate] }, updateAvailabilityHandler);

  // Get organization seats status (occupied vs available)
  fastify.get("/seats", { preHandler: [authenticate] }, getSeatsHandler);

  // Update or set seat number for staff
  fastify.patch("/seat-number", { preHandler: [authenticate] }, updateSeatNumberHandler);

  // Release currently held seat
  fastify.post("/release-seat", { preHandler: [authenticate] }, releaseSeatHandler);

  // Toggle staff break (start / end)
  fastify.post("/break", { preHandler: [authenticate] }, toggleBreakHandler);

  // Ensure default seed accounts exist
  fastify.post("/seed", seedHandler);
};
