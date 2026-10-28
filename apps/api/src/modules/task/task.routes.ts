import type { FastifyInstance } from "fastify";
import {
  getTasksHandler,
  getCompanyStaffHandler,
  createTaskHandler,
  updateTaskHandler,
  deleteTaskHandler,
} from "./task.controller.js";

export async function taskRoutes(fastify: FastifyInstance) {
  fastify.get("/", getTasksHandler);
  fastify.get("/staff", getCompanyStaffHandler);
  fastify.post("/", createTaskHandler);
  fastify.patch("/:id", updateTaskHandler);
  fastify.delete("/:id", deleteTaskHandler);
}
