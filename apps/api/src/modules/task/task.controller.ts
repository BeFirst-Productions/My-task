import type { FastifyReply, FastifyRequest } from "fastify";
import * as taskService from "./task.service.js";
import type { CreateTaskDTO } from "./task.schema.js";
import { verifyToken } from "../auth/auth.utils.js";

export async function getTasksHandler(request: FastifyRequest, reply: FastifyReply) {
  const query = request.query as { organisationId?: string; assignedToUserId?: string };
  const tasks = await taskService.listTasks(query.organisationId, query.assignedToUserId);
  return reply.send({ success: true, data: tasks });
}

export async function getCompanyStaffHandler(request: FastifyRequest, reply: FastifyReply) {
  const query = request.query as { organisationId?: string; role?: string };
  const staff = await taskService.getCompanyStaff(query.organisationId, query.role);
  return reply.send({ success: true, data: staff });
}

export async function createTaskHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const body = request.body as CreateTaskDTO;
    const task = await taskService.createTask(body);
    return reply.status(201).send({ success: true, data: task });
  } catch (err: any) {
    return reply.status(400).send({ success: false, message: err.message || "Failed to create task" });
  }
}

export async function updateTaskHandler(request: FastifyRequest, reply: FastifyReply) {
  const params = request.params as { id: string };
  const body = request.body as Partial<CreateTaskDTO> & { updaterName?: string };
  let updaterName = body.updaterName;
  if (!updaterName) {
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const decoded = verifyToken(authHeader.substring(7));
        if (decoded?.fullName || decoded?.username) {
          updaterName = (decoded as any).fullName || (decoded as any).username;
        }
      } catch {}
    }
  }
  const task = await taskService.updateTask(params.id, body, updaterName);
  return reply.send({ success: true, data: task });
}

export async function deleteTaskHandler(request: FastifyRequest, reply: FastifyReply) {
  const params = request.params as { id: string };
  const res = await taskService.deleteTask(params.id);
  return reply.send(res);
}
