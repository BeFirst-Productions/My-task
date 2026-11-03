import type { FastifyReply, FastifyRequest } from "fastify";
import * as reportService from "./report.service.js";

export async function getOrganisationAnalyticsHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const query = request.query as { organisationId?: string; timeframe?: string };
    const analytics = await reportService.getOrganisationAnalytics(query.organisationId, query.timeframe);
    return reply.send({ success: true, data: analytics });
  } catch (error: any) {
    console.error("REPORT ANALYTICS ERROR:", error);
    return reply.status(500).send({
      success: false,
      error: error?.message || "Failed to load analytics",
      code: error?.code,
      meta: error?.meta,
    });
  }
}

