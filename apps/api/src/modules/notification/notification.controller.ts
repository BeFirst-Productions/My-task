import type { FastifyReply, FastifyRequest } from "fastify";
import {
  getDynamicNotifications,
  getNotificationById,
  updateNotificationStatus,
  resendNotification,
} from "./notification.service.js";
import type { NotificationQueryParams, UpdateNotificationStatusInput } from "./notification.schema.js";

export async function getNotificationsHandler(
  request: FastifyRequest<{ Querystring: NotificationQueryParams }>,
  reply: FastifyReply
) {
  try {
    const result = await getDynamicNotifications(request.query);
    return reply.status(200).send({
      success: true,
      data: result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch notifications";
    request.log.error(error);
    return reply.status(500).send({
      success: false,
      error: "NotificationFetchError",
      message,
    });
  }
}

export async function getNotificationByIdHandler(
  request: FastifyRequest<{ Params: { id: string }; Querystring: { organisationId?: string } }>,
  reply: FastifyReply
) {
  try {
    const { id } = request.params;
    const { organisationId } = request.query;
    const notification = await getNotificationById(id, organisationId);

    if (!notification) {
      return reply.status(404).send({
        success: false,
        error: "NotFoundError",
        message: "Notification not found",
      });
    }

    return reply.status(200).send({
      success: true,
      data: notification,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch notification";
    return reply.status(500).send({
      success: false,
      error: "NotificationFetchError",
      message,
    });
  }
}

export async function updateNotificationStatusHandler(
  request: FastifyRequest<{
    Params: { id: string };
    Body: UpdateNotificationStatusInput;
    Querystring: { organisationId?: string };
  }>,
  reply: FastifyReply
) {
  try {
    const { id } = request.params;
    const { organisationId } = request.query;
    const updated = await updateNotificationStatus(id, request.body, organisationId);

    return reply.status(200).send({
      success: true,
      data: updated,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update notification status";
    return reply.status(500).send({
      success: false,
      error: "NotificationUpdateError",
      message,
    });
  }
}

export async function resendNotificationHandler(
  request: FastifyRequest<{ Params: { id: string }; Querystring: { organisationId?: string } }>,
  reply: FastifyReply
) {
  try {
    const { id } = request.params;
    const { organisationId } = request.query;
    const updated = await resendNotification(id, organisationId);

    return reply.status(200).send({
      success: true,
      data: updated,
      message: "Notification resent successfully",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to resend notification";
    return reply.status(500).send({
      success: false,
      error: "NotificationResendError",
      message,
    });
  }
}

