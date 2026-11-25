import type { FastifyRequest, FastifyReply } from "fastify";
import {
  getStaffManagementData,
  updateStaffLiveStatus,
  type StaffLiveStatus,
} from "./staff-management.service.js";

export async function getStaffManagementHandler(
  request: FastifyRequest<{
    Querystring: {
      organisationId?: string;
      search?: string;
      status?: string;
      service?: string;
      client?: string;
      sortBy?: string;
    };
  }>,
  reply: FastifyReply
) {
  try {
    const user = (request as any).user;
    const orgId = request.query.organisationId || user?.organisationId || user?.organisation?.subdomain;

    const result = await getStaffManagementData(orgId, {
      search: request.query.search,
      status: request.query.status,
      service: request.query.service,
      client: request.query.client,
      sortBy: request.query.sortBy,
    });

    return reply.status(200).send({
      success: true,
      data: result.staff,
      filters: result.filters,
      totalCount: result.totalCount,
    });
  } catch (error: any) {
    request.log.error(error);
    return reply.status(500).send({
      success: false,
      message: error?.message || "Failed to retrieve staff management data",
    });
  }
}

export async function updateStaffStatusHandler(
  request: FastifyRequest<{
    Params: { id: string };
    Body: { status: StaffLiveStatus | "TOGGLE_BREAK" | "TOGGLE_AVAILABLE" };
  }>,
  reply: FastifyReply
) {
  try {
    const { id } = request.params;
    const { status } = request.body || {};

    if (!status) {
      return reply.status(400).send({
        success: false,
        message: "Status is required",
      });
    }

    const result = await updateStaffLiveStatus(id, status);

    return reply.status(200).send({
      success: true,
      message: "Staff availability updated successfully",
      data: result,
    });
  } catch (error: any) {
    request.log.error(error);
    return reply.status(400).send({
      success: false,
      message: error?.message || "Failed to update staff status",
    });
  }
}
