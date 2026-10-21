import type { FastifyPluginAsync } from "fastify";
import {
  createOrganisationHandler,
  getOrganisationsHandler,
  getOrganisationByIdHandler,
  updateOrganisationHandler,
  updateOrganisationStatusHandler,
  deleteOrganisationHandler,
} from "./organization.controller.js";

export const organisationRoutes: FastifyPluginAsync = async (fastify) => {
  // Create a new organisation (Company Details, Super Admin Credentials, WhatsApp & Email config)
  fastify.post("/", createOrganisationHandler);

  // List all organisations with pagination, status filter, and search
  fastify.get("/", getOrganisationsHandler);

  // Get single organisation details by ID
  fastify.get("/:id", getOrganisationByIdHandler);

  // Update organisation company details
  fastify.patch("/:id", updateOrganisationHandler);

  // Update organisation status (ACTIVE, INACTIVE, SUSPENDED)
  fastify.patch("/:id/status", updateOrganisationStatusHandler);

  // Delete an organisation
  fastify.delete("/:id", deleteOrganisationHandler);
};
