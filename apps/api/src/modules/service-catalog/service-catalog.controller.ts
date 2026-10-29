import type { FastifyRequest, FastifyReply } from "fastify";
import { getOrSeedServiceCatalog } from "./service-catalog.service.js";

export async function getServiceCatalogHandler(
  request: FastifyRequest<{ Querystring: { organisationId?: string } }>,
  reply: FastifyReply
) {
  try {
    const orgId = request.query.organisationId;
    const catalog = await getOrSeedServiceCatalog(orgId);
    return reply.status(200).send({
      success: true,
      data: catalog,
    });
  } catch (error: any) {
    request.log.error(error);
    return reply.status(500).send({
      success: false,
      message: error?.message || "Failed to fetch service catalog",
    });
  }
}

