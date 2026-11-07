import type { FastifyRequest, FastifyReply } from "fastify";
import { searchGlobal, type GlobalSearchParams } from "./search.service.js";

export async function searchGlobalHandler(
  request: FastifyRequest<{ Querystring: GlobalSearchParams }>,
  reply: FastifyReply
) {
  try {
    const user = (request as any).user;
    const query = request.query;

    const results = await searchGlobal({
      q: query.q || "",
      organisationId: query.organisationId || user?.organisationId || user?.subdomain,
      userRole: query.userRole || user?.role || "STAFF",
      currentUserId: query.currentUserId || user?.userId || user?.id,
      permittedModules: query.permittedModules,
    });

    return reply.status(200).send({
      success: true,
      data: results,
    });
  } catch (error: any) {
    request.log.error(error);
    return reply.status(500).send({
      success: false,
      message: error?.message || "Failed to execute global search",
    });
  }
}

