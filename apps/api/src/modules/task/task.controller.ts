import type { FastifyReply, FastifyRequest } from "fastify";
import * as taskService from "./task.service.js";
import type { CreateTaskDTO } from "./task.schema.js";

export async function getTasksHandler(request: FastifyRequest, reply: FastifyReply) {
  const query = request.query as { organisationId?: string };
  const tasks = await taskService.listTasks(query.organisationId);
  return reply.send({ success: true, data: tasks });
}

export async function getCompanyStaffHandler(request: FastifyRequest, reply: FastifyReply) {
  const query = request.query as { organisationId?: string };
  const staff = await taskService.getCompanyStaff(query.organisationId);
  return reply.send({ success: true, data: staff });
}

export async function createTaskHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as CreateTaskDTO;
  const task = await taskService.createTask(body);
  return reply.status(201).send({ success: true, data: task });
}

export async function updateTaskHandler(request: FastifyRequest, reply: FastifyReply) {
  const params = request.params as { id: string };
  const body = request.body as Partial<CreateTaskDTO>;
  const task = await taskService.updateTask(params.id, body);
  return reply.send({ success: true, data: task });
}

export async function deleteTaskHandler(request: FastifyRequest, reply: FastifyReply) {
  const params = request.params as { id: string };
  const res = await taskService.deleteTask(params.id);
  return reply.send(res);
}
