import type { FastifyPluginAsync } from "fastify";
import { getMeHandler, loginHandler, seedHandler } from "./auth.controller.js";

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  // Login with username/email and password
  fastify.post("/login", loginHandler);

  // Get current logged-in user session
  fastify.get("/me", getMeHandler);

  // Ensure default seed accounts exist
  fastify.post("/seed", seedHandler);
};
