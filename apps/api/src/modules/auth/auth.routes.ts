import type { FastifyPluginAsync } from "fastify";
import { getMeHandler, loginHandler, seedHandler, updateAvailabilityHandler } from "./auth.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  // Login with username/email and password
  fastify.post("/login", loginHandler);

  // Get current logged-in user session
  fastify.get("/me", getMeHandler);

  // Update online/offline availability for staff
  fastify.patch("/availability", { preHandler: [authenticate] }, updateAvailabilityHandler);

  // Ensure default seed accounts exist
  fastify.post("/seed", seedHandler);
};
