import type { FastifyInstance } from "fastify";
import { getOrganisationAnalyticsHandler } from "./report.controller.js";

export async function reportRoutes(fastify: FastifyInstance) {
  fastify.get("/analytics", getOrganisationAnalyticsHandler);
}

