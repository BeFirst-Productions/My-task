import type { FastifyPluginAsync } from "fastify";
import {
  authenticate,
  requireRole,
  requireTenantUser,
} from "../../middleware/auth.middleware.js";
import {
  getTenantUsersHandler,
  createTenantUserHandler,
  getTenantUserByIdHandler,
  updateTenantUserHandler,
  deleteTenantUserHandler,
  getPlatformUsersHandler,
  updatePlatformUserStatusHandler,
} from "./user.controller.js";

/**
 * Organization Tenant User Routes:
 * Scoped strictly to the logged-in user's organization.
 * Only SUPER_ADMIN and ADMIN can access.
 */
export const tenantUserRoutes: FastifyPluginAsync = async (fastify) => {
  // Common preHandler guards for all tenant user routes
  const tenantGuards = [
    authenticate,
    requireTenantUser,
    requireRole(["SUPER_ADMIN", "ADMIN"]),
  ];

  // List all users in organization with pagination, search, and department filters
  fastify.get("/", { preHandler: tenantGuards }, getTenantUsersHandler);

  // Add a new user (ADMIN or STAFF) to the organization
  fastify.post("/", { preHandler: tenantGuards }, createTenantUserHandler);

  // Get single user details
  fastify.get("/:id", { preHandler: tenantGuards }, getTenantUserByIdHandler);

  // Update user in organization
  fastify.patch("/:id", { preHandler: tenantGuards }, updateTenantUserHandler);

  // Delete user from organization
  fastify.delete("/:id", { preHandler: tenantGuards }, deleteTenantUserHandler);
};

/**
 * Platform Owner User Routes:
 * Accessible only by PLATFORM_OWNER to manage users globally.
 */
export const platformUserRoutes: FastifyPluginAsync = async (fastify) => {
  const platformGuards = [authenticate, requireRole(["PLATFORM_OWNER"])];

  // List all users globally across all organizations
  fastify.get("/", { preHandler: platformGuards }, getPlatformUsersHandler);

  // Update account status globally (ACTIVE, INACTIVE, SUSPENDED)
  fastify.patch("/:id/status", { preHandler: platformGuards }, updatePlatformUserStatusHandler);
};
