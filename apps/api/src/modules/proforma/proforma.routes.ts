import type { FastifyInstance } from "fastify";
import { authenticate } from "../../middleware/auth.middleware.js";
import {
  listProformasHandler,
  getProformaByIdHandler,
  createProformaHandler,
  deleteProformaHandler,
} from "./proforma.controller.js";

export async function proformaRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", authenticate);

  fastify.get("/", listProformasHandler);
  fastify.post("/", createProformaHandler);
  fastify.get("/:id", getProformaByIdHandler);
  fastify.delete("/:id", deleteProformaHandler);
}
