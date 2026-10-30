import type { FastifyInstance } from "fastify";
import { authenticate } from "../../middleware/auth.middleware.js";
import {
  createClientHandler,
  generateProformaHandler,
  listClientsHandler,
  getClientDetailsHandler,
  convertToWorkHandler,
  topUpWalletHandler,
  getSalesStaffHandler,
} from "./client.controller.js";

export async function clientRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", authenticate);

  fastify.get("/", listClientsHandler);
  fastify.get("/sales-staff", getSalesStaffHandler);
  fastify.post("/", createClientHandler);
  fastify.get("/:id", getClientDetailsHandler);
  fastify.post("/:id/generate-proforma", generateProformaHandler);
  fastify.post("/:id/convert-to-work", convertToWorkHandler);
  fastify.post("/:id/top-up-wallet", topUpWalletHandler);
}
