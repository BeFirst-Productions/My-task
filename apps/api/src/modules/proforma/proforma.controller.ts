import type { FastifyRequest, FastifyReply } from "fastify";
import { listProformas, getProformaById } from "./proforma.service.js";

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

