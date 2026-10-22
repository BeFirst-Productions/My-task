import type { FastifyReply, FastifyRequest } from "fastify";
import {
  createTenantUserSchema,
  updateTenantUserSchema,
  userQuerySchema,
  updateUserStatusSchema,
} from "./user.schema.js";
import {
  createTenantUser,
  getTenantUsers,
  getTenantUserById,
  updateTenantUser,
  deleteTenantUser,
  getPlatformUsers,
  updatePlatformUserStatus,
} from "./user.service.js";

// ==========================================
// Organization Tenant User Handlers
// ==========================================

/**
 * GET /api/org/users
 * Returns users belonging exclusively to the authenticated user's organization.
 */
export async function getTenantUsersHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const organisationId = request.user?.organisationId;
    if (!organisationId) {
      return reply.status(403).send({
        success: false,
        error: "Forbidden",
        message: "Active organization context is missing from token.",
      });
    }

    const queryResult = userQuerySchema.safeParse(request.query);
    const query = queryResult.success ? queryResult.data : {};

    const data = await getTenantUsers(organisationId, query);

    return reply.status(200).send({
      success: true,
      data: data.users,
      pagination: data.pagination,
    });
  } catch (error) {
    return reply.status(500).send({
      success: false,
      error: "QueryFailed",
      message: error instanceof Error ? error.message : "Failed to retrieve organization users.",
    });
  }
}

/**
 * POST /api/org/users
 * Adds a new Admin or Staff user to the authenticated organization.
 */
export async function createTenantUserHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const organisationId = request.user?.organisationId;
    const actorId = request.user?.userId;

    if (!organisationId || !actorId) {
      return reply.status(403).send({
        success: false,
        error: "Forbidden",
        message: "Active organization context is required.",
      });
    }

    const parseResult = createTenantUserSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        success: false,
        error: "ValidationError",
        message: parseResult.error.errors.map((e) => e.message).join(", "),
        details: parseResult.error.flatten().fieldErrors,
      });
    }

    const user = await createTenantUser(organisationId, actorId, parseResult.data);

    return reply.status(201).send({
      success: true,
      message: "User successfully added to organization.",
      data: user,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to create user.";
    const isConflict = msg.includes("already exists") || msg.includes("already taken");
    const statusCode = isConflict ? 409 : 400;

    return reply.status(statusCode).send({
      success: false,
      error: isConflict ? "ConflictError" : "CreateUserFailed",
      message: msg,
    });
  }
}

/**
 * GET /api/org/users/:id
 * Retrieves a single user within the authenticated organization.
 */
export async function getTenantUserByIdHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const organisationId = request.user?.organisationId;
    if (!organisationId) {
      return reply.status(403).send({
        success: false,
        error: "Forbidden",
        message: "Active organization context is required.",
      });
    }

    const user = await getTenantUserById(organisationId, request.params.id);

    return reply.status(200).send({
      success: true,
      data: user,
    });
  } catch (error) {
    return reply.status(404).send({
      success: false,
      error: "NotFound",
      message: error instanceof Error ? error.message : "User not found.",
    });
  }
}

/**
 * PATCH /api/org/users/:id
 * Updates an organization team member.
 */
export async function updateTenantUserHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const organisationId = request.user?.organisationId;
    if (!organisationId) {
      return reply.status(403).send({
        success: false,
        error: "Forbidden",
        message: "Active organization context is required.",
      });
    }

    const parseResult = updateTenantUserSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        success: false,
        error: "ValidationError",
        message: parseResult.error.errors.map((e) => e.message).join(", "),
      });
    }

    const updated = await updateTenantUser(organisationId, request.params.id, parseResult.data);

    return reply.status(200).send({
      success: true,
      message: "User successfully updated.",
      data: updated,
    });
  } catch (error) {
    return reply.status(400).send({
      success: false,
      error: "UpdateFailed",
      message: error instanceof Error ? error.message : "Failed to update user.",
    });
  }
}

/**
 * DELETE /api/org/users/:id
 * Deletes a team member from the organization.
 */
export async function deleteTenantUserHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const organisationId = request.user?.organisationId;
    const actorId = request.user?.userId;

    if (!organisationId || !actorId) {
      return reply.status(403).send({
        success: false,
        error: "Forbidden",
        message: "Active organization context is required.",
      });
    }

    const result = await deleteTenantUser(organisationId, request.params.id, actorId);

    return reply.status(200).send({
      success: true,
      message: result.message,
    });
  } catch (error) {
    return reply.status(400).send({
      success: false,
      error: "DeleteFailed",
      message: error instanceof Error ? error.message : "Failed to remove user.",
    });
  }
}

// ==========================================
// Platform Owner Handlers
// ==========================================

/**
 * GET /api/platform/users
 * Returns all users across the entire SaaS platform with optional filters.
 */
export async function getPlatformUsersHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const queryResult = userQuerySchema.safeParse(request.query);
    const query = queryResult.success ? queryResult.data : {};
    const organisationId = (request.query as any)?.organisationId;

    const data = await getPlatformUsers({
      ...query,
      organisationId,
    });

    return reply.status(200).send({
      success: true,
      data: data.users,
      pagination: data.pagination,
    });
  } catch (error) {
    return reply.status(500).send({
      success: false,
      error: "PlatformQueryFailed",
      message: error instanceof Error ? error.message : "Failed to fetch platform users.",
    });
  }
}

/**
 * PATCH /api/platform/users/:id/status
 * Updates any user account status globally (ACTIVE, INACTIVE, SUSPENDED).
 */
export async function updatePlatformUserStatusHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const parseResult = updateUserStatusSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        success: false,
        error: "ValidationError",
        message: parseResult.error.errors.map((e) => e.message).join(", "),
      });
    }

    const updated = await updatePlatformUserStatus(request.params.id, parseResult.data.status);

    return reply.status(200).send({
      success: true,
      message: `User status changed to ${parseResult.data.status}.`,
      data: updated,
    });
  } catch (error) {
    return reply.status(400).send({
      success: false,
      error: "StatusUpdateFailed",
      message: error instanceof Error ? error.message : "Failed to update user status.",
    });
  }
}
