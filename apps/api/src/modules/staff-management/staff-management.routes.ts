import type { FastifyInstance } from "fastify";
import {
  getStaffManagementHandler,
  updateStaffStatusHandler,
} from "./staff-management.controller.js";

export async function staffManagementRoutes(app: FastifyInstance) {
  app.get("/", getStaffManagementHandler);
  app.patch("/:id/status", updateStaffStatusHandler);
}
