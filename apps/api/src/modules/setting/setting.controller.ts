import type { FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import { updateSettingInputSchema } from "./setting.schema.js";
import {
  getPlatformSetting,
  updatePlatformSetting,
  getOrganisationSetting,
  updateOrganisationSetting,
} from "./setting.service.js";

/**
 * GET /api/settings/platform
 * Retrieves the global SaaS platform settings
 */
export async function getPlatformSettingHandler(
  _request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const data = await getPlatformSetting();
    return reply.status(200).send({
      success: true,
      data,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch platform settings";
    return reply.status(500).send({
      success: false,
      error: "InternalServerError",
      message,
    });
  }
}

/**
 * PATCH /api/settings/platform
 * Updates platform-wide settings (Scope: PLATFORM)
 */
export async function updatePlatformSettingHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const validatedData = updateSettingInputSchema.parse(request.body);
    const userId = (request as any).user?.id;
    const data = await updatePlatformSetting(validatedData, userId);

    return reply.status(200).send({
      success: true,
      message: "Platform settings updated successfully.",
      data,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return reply.status(400).send({
        success: false,
        error: "ValidationError",
        message: "Invalid setting parameters",
        details: error.issues.map((i) => ({ field: i.path.join("."), message: i.message })),
      });
    }

    const message = error instanceof Error ? error.message : "Failed to update platform settings";
    return reply.status(500).send({
      success: false,
      error: "InternalServerError",
      message,
    });
  }
}

/**
 * GET /api/settings/organisation/:idOrSubdomain
 * Retrieves the tenant-specific settings for an organisation
 */
export async function getOrganisationSettingHandler(
  request: FastifyRequest<{ Params: { idOrSubdomain: string } }>,
  reply: FastifyReply
) {
  try {
    const { idOrSubdomain } = request.params;
    const data = await getOrganisationSetting(idOrSubdomain);

    return reply.status(200).send({
      success: true,
      data,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch organisation settings";
    const isNotFound = message.includes("not found");

    return reply.status(isNotFound ? 404 : 500).send({
      success: false,
      error: isNotFound ? "NotFoundError" : "InternalServerError",
      message,
    });
  }
}

/**
 * PATCH /api/settings/organisation/:idOrSubdomain
 * Updates tenant-specific settings for an organisation (Scope: ORGANISATION)
 */
export async function updateOrganisationSettingHandler(
  request: FastifyRequest<{ Params: { idOrSubdomain: string } }>,
  reply: FastifyReply
) {
  try {
    const { idOrSubdomain } = request.params;
    const validatedData = updateSettingInputSchema.parse(request.body);
    const userId = (request as any).user?.id;
    const data = await updateOrganisationSetting(idOrSubdomain, validatedData, userId);

    return reply.status(200).send({
      success: true,
      message: "Organisation settings updated successfully.",
      data,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return reply.status(400).send({
        success: false,
        error: "ValidationError",
        message: "Invalid setting parameters",
        details: error.issues.map((i) => ({ field: i.path.join("."), message: i.message })),
      });
    }

    const message = error instanceof Error ? error.message : "Failed to update organisation settings";
    const isNotFound = message.includes("not found");

    return reply.status(isNotFound ? 404 : 500).send({
      success: false,
      error: isNotFound ? "NotFoundError" : "InternalServerError",
      message,
    });
  }
}
