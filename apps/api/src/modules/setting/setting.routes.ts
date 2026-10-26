import type { FastifyPluginAsync } from "fastify";
import {
  getPlatformSettingHandler,
  updatePlatformSettingHandler,
  getOrganisationSettingHandler,
  updateOrganisationSettingHandler,
} from "./setting.controller.js";

export const settingRoutes: FastifyPluginAsync = async (fastify) => {
  // Platform settings routes
  fastify.get("/platform", getPlatformSettingHandler);
  fastify.patch("/platform", updatePlatformSettingHandler);

  // Organisation settings routes (accessible via org ID or subdomain)
  fastify.get("/organisation/:idOrSubdomain", getOrganisationSettingHandler);
  fastify.patch("/organisation/:idOrSubdomain", updateOrganisationSettingHandler);
};
