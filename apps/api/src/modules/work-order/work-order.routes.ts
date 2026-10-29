import type { FastifyInstance } from "fastify";
import { authenticate } from "../../middleware/auth.middleware.js";
import {
  listWorkOrdersHandler,
  assignServicesHandler,
  updateWorkOrderStatusHandler,
} from "./work-order.controller.js";

export async function workOrderRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", authenticate);

  fastify.get("/", listWorkOrdersHandler);
  fastify.post("/assign", assignServicesHandler);
  fastify.patch("/:id/status", updateWorkOrderStatusHandler);
}
