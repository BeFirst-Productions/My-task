import type { FastifyRequest, FastifyReply } from "fastify";
import { listProformas, getProformaById, createProforma, CreateProformaInput } from "./proforma.service.js";

export async function listProformasHandler(
  request: FastifyRequest<{ Querystring: { organisationId?: string } }>,
  reply: FastifyReply
) {
  try {
    const list = await listProformas(request.query.organisationId);
    return reply.status(200).send({
      success: true,
      data: list,
    });
  } catch (error: any) {
    request.log.error(error);
    return reply.status(500).send({
      success: false,
      message: error?.message || "Failed to list proforma invoices",
    });
  }
}

export async function getProformaByIdHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const proforma = await getProformaById(request.params.id);
    if (!proforma) {
      return reply.status(404).send({
        success: false,
        message: "Proforma invoice not found",
      });
    }
    return reply.status(200).send({
      success: true,
      data: proforma,
    });
  } catch (error: any) {
    request.log.error(error);
    return reply.status(500).send({
      success: false,
      message: error?.message || "Failed to get proforma invoice",
    });
  }
}

export async function createProformaHandler(
  request: FastifyRequest<{ Body: CreateProformaInput }>,
  reply: FastifyReply
) {
  try {
    const user = (request as any).user;
    const body: CreateProformaInput = {
      ...request.body,
      organisationId: request.body.organisationId || user?.organisationId,
      generatedById: request.body.generatedById || user?.id,
    };
    const proforma = await createProforma(body);
    return reply.status(201).send({
      success: true,
      message: "Proforma invoice created successfully",
      data: proforma,
    });
  } catch (error: any) {
    request.log.error(error);
    return reply.status(400).send({
      success: false,
      message: error?.message || "Failed to create proforma invoice",
    });
  }
}
