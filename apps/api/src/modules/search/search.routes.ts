import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { authenticate } from "../../middleware/auth.middleware.js";
import { searchGlobalHandler } from "./search.controller.js";

// Optional auth preHandler: attaches authenticated user when Bearer token is provided
async function optionalAuthenticate(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      await authenticate(request, reply);
    } catch {
      // Allow fallback to query parameters for seamless workspace searching
    }
  }
}

export async function searchRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", optionalAuthenticate);

  fastify.get("/global", searchGlobalHandler);
}
