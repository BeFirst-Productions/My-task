import type { FastifyRequest, FastifyReply } from "fastify";
import {
  listWorkOrders,
  assignServicesToStaff,
  updateWorkOrderStatus,
  type ListWorkOrdersQuery,
  type AssignServicesInput,
  type UpdateWorkOrderStatusInput,
} from "./work-order.service.js";

export async function listWorkOrdersHandler(
  request: FastifyRequest<{ Querystring: ListWorkOrdersQuery }>,
  reply: FastifyReply
) {
  try {
    const orders = await listWorkOrders(request.query);
    return reply.status(200).send({
      success: true,
      data: orders,
    });
  } catch (error: any) {
    request.log.error(error);
    return reply.status(500).send({
      success: false,
      message: error?.message || "Failed to list work orders",
    });
  }
}

export async function assignServicesHandler(
  request: FastifyRequest<{ Body: AssignServicesInput }>,
  reply: FastifyReply
) {
  try {
    const result = await assignServicesToStaff(request.body);
    return reply.status(200).send({
      success: true,
      message: `Assigned ${result.assignedCount} service(s) to ${result.staffName} successfully`,
      data: result,
    });
  } catch (error: any) {
    request.log.error(error);
    return reply.status(400).send({
      success: false,
      message: error?.message || "Failed to assign services to staff",
    });
  }
}

export async function updateWorkOrderStatusHandler(
  request: FastifyRequest<{
    Params: { id: string };
    Body: Omit<UpdateWorkOrderStatusInput, "serviceItemId">;
  }>,
  reply: FastifyReply
) {
  try {
    const { id } = request.params;
    const result = await updateWorkOrderStatus({
      serviceItemId: id,
      ...request.body,
    });
    return reply.status(200).send({
      success: true,
      message: "Work order status updated successfully",
      data: result,
    });
  } catch (error: any) {
    request.log.error(error);
    return reply.status(400).send({
      success: false,
      message: error?.message || "Failed to update work order status",
    });
  }
}

