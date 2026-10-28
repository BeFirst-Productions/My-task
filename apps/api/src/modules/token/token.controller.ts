import type { FastifyRequest, FastifyReply } from "fastify";
import {
  createTokenInputSchema,
  updateTokenStatusSchema,
  addTokenMessageSchema,
} from "./token.schema.js";
import {
  createSupportToken,
  getTokensForOrganisation,
  getAllTokensForPlatform,
  getTokenById,
  updateTokenStatus,
  addMessageToToken,
  getDomainEditStatus,
} from "./token.service.js";
import { prisma } from "../../database/index.js";

export async function createTokenHandler(
  request: FastifyRequest<{
    Body: any;
    Querystring: { organisationId?: string; orgSubdomain?: string };
  }>,
  reply: FastifyReply
) {
  try {
    const input = createTokenInputSchema.parse(request.body);
    const orgTarget =
      (request.body as any).organisationId ||
      (request.body as any).orgSubdomain ||
      request.query.organisationId ||
      request.query.orgSubdomain;

    if (!orgTarget) {
      return reply.status(400).send({
        success: false,
        error: "Organisation identifier (organisationId or orgSubdomain) is required.",
      });
    }

    const user = (request as any).user;
    const token = await createSupportToken(orgTarget, input, user);

    return reply.status(201).send({
      success: true,
      data: token,
      message: `Token #${token.tokenNumber} raised successfully. Platform Owner has been notified.`,
    });
  } catch (err: any) {
    request.log.error(err);
    return reply.status(err.statusCode || 400).send({
      success: false,
      error: err.message || "Failed to create support token.",
    });
  }
}

export async function getOrganisationTokensHandler(
  request: FastifyRequest<{
    Params: { idOrSubdomain: string };
    Querystring: { status?: string; category?: string };
  }>,
  reply: FastifyReply
) {
  try {
    const { idOrSubdomain } = request.params;
    const { status, category } = request.query;

    const tokens = await getTokensForOrganisation(idOrSubdomain, { status, category });
    return reply.send({
      success: true,
      data: tokens,
    });
  } catch (err: any) {
    request.log.error(err);
    return reply.status(err.statusCode || 404).send({
      success: false,
      error: err.message || "Failed to retrieve organisation tokens.",
    });
  }
}

export async function getPlatformTokensHandler(
  request: FastifyRequest<{
    Querystring: { status?: string; category?: string; organisationId?: string };
  }>,
  reply: FastifyReply
) {
  try {
    const { status, category, organisationId } = request.query;
    const tokens = await getAllTokensForPlatform({ status, category, organisationId });

    return reply.send({
      success: true,
      data: tokens,
    });
  } catch (err: any) {
    request.log.error(err);
    return reply.status(500).send({
      success: false,
      error: err.message || "Failed to retrieve platform tokens.",
    });
  }
}

export async function getTokenDetailsHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const { id } = request.params;
    const token = await getTokenById(id);

    return reply.send({
      success: true,
      data: token,
    });
  } catch (err: any) {
    request.log.error(err);
    return reply.status(err.statusCode || 404).send({
      success: false,
      error: err.message || "Token not found.",
    });
  }
}

export async function updateTokenStatusHandler(
  request: FastifyRequest<{ Params: { id: string }; Body: any }>,
  reply: FastifyReply
) {
  try {
    const { id } = request.params;
    const input = updateTokenStatusSchema.parse(request.body);
    const user = (request as any).user;

    const updated = await updateTokenStatus(id, input, user);

    return reply.send({
      success: true,
      data: updated,
      message: `Token status updated to "${input.status}". Organisation has been notified.`,
    });
  } catch (err: any) {
    request.log.error(err);
    return reply.status(err.statusCode || 400).send({
      success: false,
      error: err.message || "Failed to update token status.",
    });
  }
}

export async function addTokenMessageHandler(
  request: FastifyRequest<{ Params: { id: string }; Body: any }>,
  reply: FastifyReply
) {
  try {
    const { id } = request.params;
    const { message } = addTokenMessageSchema.parse(request.body);
    const user = (request as any).user;

    const newMsg = await addMessageToToken(id, message, user);

    return reply.status(201).send({
      success: true,
      data: newMsg,
    });
  } catch (err: any) {
    request.log.error(err);
    return reply.status(err.statusCode || 400).send({
      success: false,
      error: err.message || "Failed to add token message.",
    });
  }
}

export async function getDomainStatusHandler(
  request: FastifyRequest<{ Params: { idOrSubdomain: string } }>,
  reply: FastifyReply
) {
  try {
    const { idOrSubdomain } = request.params;
    const status = await getDomainEditStatus(idOrSubdomain);

    return reply.send({
      success: true,
      data: status,
    });
  } catch (err: any) {
    request.log.error(err);
    return reply.status(err.statusCode || 404).send({
      success: false,
      error: err.message || "Failed to get domain status.",
    });
  }
}

/**
 * System notifications handler
 */
export async function getSystemNotificationsHandler(
  request: FastifyRequest<{
    Querystring: { role?: string; organisationId?: string; limit?: string };
  }>,
  reply: FastifyReply
) {
  try {
    const { role, organisationId, limit } = request.query;
    const user = (request as any).user;

    const targetRole = role || user?.role || "SUPER_ADMIN";
    const take = limit ? Math.min(Number(limit), 50) : 25;

    const where: any = {};
    if (targetRole === "PLATFORM_OWNER") {
      where.recipientRole = "PLATFORM_OWNER";
    } else {
      where.recipientRole = "SUPER_ADMIN";
      if (organisationId) {
        where.organisationId = organisationId;
      }
    }

    const notifications = await prisma.systemNotification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
    });

    const unreadCount = await prisma.systemNotification.count({
      where: { ...where, isRead: false },
    });

    return reply.send({
      success: true,
      data: {
        notifications,
        unreadCount,
      },
    });
  } catch (err: any) {
    request.log.error(err);
    return reply.status(500).send({
      success: false,
      error: err.message || "Failed to fetch notifications.",
    });
  }
}

export async function markNotificationReadHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const { id } = request.params;
    await prisma.systemNotification.update({
      where: { id },
      data: { isRead: true },
    });

    return reply.send({ success: true });
  } catch (err: any) {
    request.log.error(err);
    return reply.status(400).send({ success: false, error: err.message });
  }
}

export async function markAllNotificationsReadHandler(
  request: FastifyRequest<{ Body: { role?: string; organisationId?: string } }>,
  reply: FastifyReply
) {
  try {
    const { role, organisationId } = request.body || {};
    const where: any = {};
    if (role === "PLATFORM_OWNER") {
      where.recipientRole = "PLATFORM_OWNER";
    } else {
      where.recipientRole = "SUPER_ADMIN";
      if (organisationId) {
        where.organisationId = organisationId;
      }
    }

    await prisma.systemNotification.updateMany({
      where,
      data: { isRead: true },
    });

    return reply.send({ success: true });
  } catch (err: any) {
    request.log.error(err);
    return reply.status(400).send({ success: false, error: err.message });
  }
}
