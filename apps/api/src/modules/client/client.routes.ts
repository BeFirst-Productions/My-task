import type { FastifyInstance } from "fastify";
import { authenticate } from "../../middleware/auth.middleware.js";
import {
  createClientHandler,
  listClientsHandler,
  getClientDetailsHandler,
  convertToWorkHandler,
  topUpWalletHandler,
} from "./client.controller.js";

export async function clientRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", authenticate);

  fastify.get("/", listClientsHandler);
  fastify.post("/", createClientHandler);
  fastify.get("/:id", getClientDetailsHandler);
  fastify.post("/:id/convert-to-work", convertToWorkHandler);
  fastify.post("/:id/top-up-wallet", topUpWalletHandler);
}
