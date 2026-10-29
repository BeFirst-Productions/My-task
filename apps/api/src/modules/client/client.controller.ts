import type { FastifyRequest, FastifyReply } from "fastify";
import {
  createClientWithServices,
  listClients,
  getClientDetails,
  convertClientToWork,
  topUpClientWallet,
  getSalesStaffList,
  type CreateClientDTO,
  type ConvertToWorkInput,
  type TopUpWalletInput,
} from "./client.service.js";

export async function createClientHandler(
  request: FastifyRequest<{ Body: CreateClientDTO }>,
  reply: FastifyReply
) {
  try {
    const user = (request as any).user;
    const body: CreateClientDTO = {
      ...request.body,
      organisationId: request.body.organisationId || user?.organisationId,
      createdById: request.body.createdById || user?.id,
    };
    const result = await createClientWithServices(body);
    return reply.status(201).send({
      success: true,
      message: "Client and service package created successfully",
      data: result,
    });
  } catch (error: any) {
    request.log.error(error);
    return reply.status(400).send({
      success: false,
      message: error?.message || "Failed to create client",
    });
  }
}

export async function listClientsHandler(
  request: FastifyRequest<{
    Querystring: { organisationId?: string; query?: string; status?: string };
  }>,
  reply: FastifyReply
) {
  try {
    const user = (request as any).user;
    const { organisationId, query, status } = request.query;
    const targetOrgId = organisationId || user?.organisationId;
    const clients = await listClients(targetOrgId, query, status);
    return reply.status(200).send({
      success: true,
      data: clients,
    });
  } catch (error: any) {
    request.log.error(error);
    return reply.status(500).send({
      success: false,
      message: error?.message || "Failed to list clients",
    });
  }
}

export async function getClientDetailsHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const { id } = request.params;
    const client = await getClientDetails(id);
    if (!client) {
      return reply.status(404).send({
        success: false,
        message: "Client not found",
      });
    }
    return reply.status(200).send({
      success: true,
      data: client,
    });
  } catch (error: any) {
    request.log.error(error);
    return reply.status(500).send({
      success: false,
      message: error?.message || "Failed to get client details",
    });
  }
}

export async function convertToWorkHandler(
  request: FastifyRequest<{
    Params: { id: string };
    Body: Omit<ConvertToWorkInput, "clientId">;
  }>,
  reply: FastifyReply
) {
  try {
    const { id } = request.params;
    const result = await convertClientToWork({
      clientId: id,
      ...request.body,
    });
    return reply.status(200).send({
      success: true,
      message: "Work approved and advance payment credited to wallet successfully",
      data: result,
    });
  } catch (error: any) {
    request.log.error(error);
    return reply.status(400).send({
      success: false,
      message: error?.message || "Failed to convert client to work",
    });
  }
}

export async function topUpWalletHandler(
  request: FastifyRequest<{
    Params: { id: string };
    Body: Omit<TopUpWalletInput, "clientId">;
  }>,
  reply: FastifyReply
) {
  try {
    const { id } = request.params;
    const result = await topUpClientWallet({
      clientId: id,
      ...request.body,
    });
    return reply.status(200).send({
      success: true,
      message: "Client wallet topped up successfully",
      data: result,
    });
  } catch (error: any) {
    request.log.error(error);
    return reply.status(400).send({
      success: false,
      message: error?.message || "Failed to top up wallet",
    });
  }
}

export async function getSalesStaffHandler(
  request: FastifyRequest<{ Querystring: { organisationId?: string } }>,
  reply: FastifyReply
) {
  try {
    const user = (request as any).user;
    const { organisationId } = request.query;
    const targetOrgId = organisationId || user?.organisationId;
    const staff = await getSalesStaffList(targetOrgId);
    return reply.status(200).send({
      success: true,
      data: staff,
    });
  } catch (error: any) {
    request.log.error(error);
    return reply.status(500).send({
      success: false,
      message: error?.message || "Failed to list sales staff",
    });
  }
}

