import type { FastifyInstance } from "fastify";
import { authenticate } from "../../middleware/auth.middleware.js";
import { getServiceCatalogHandler } from "./service-catalog.controller.js";

export async function serviceCatalogRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", authenticate);

  fastify.get("/", getServiceCatalogHandler);
}
