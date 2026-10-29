import type { FastifyInstance } from "fastify";
import { authenticate } from "../../middleware/auth.middleware.js";
import { listProformasHandler, getProformaByIdHandler } from "./proforma.controller.js";

export async function proformaRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", authenticate);

  fastify.get("/", listProformasHandler);
  fastify.get("/:id", getProformaByIdHandler);
}
