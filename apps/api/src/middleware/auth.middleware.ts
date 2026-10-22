import type { FastifyReply, FastifyRequest } from "fastify";
import { verifyToken, type TokenPayload } from "../modules/auth/auth.utils.js";

export interface RequestUser {
  userId: string;
  role: string;
  organisationId: string | null;
  subdomain?: string | null;
}

declare module "fastify" {
  interface FastifyRequest {
    user?: RequestUser;
  }
}

/**
 * Middleware: Verifies the Bearer JWT token in the Authorization header.
 * Attaches the decoded user to `request.user`.
 */
export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return reply.status(401).send({
      success: false,
      error: "Unauthorized",
      message: "Authentication token is missing or malformed.",
    });
  }

  const token = authHeader.substring(7);
  const payload = verifyToken(token);

  if (!payload || !payload.userId) {
    return reply.status(401).send({
      success: false,
      error: "Unauthorized",
      message: "Authentication token is invalid or has expired.",
    });
  }

  request.user = {
    userId: payload.userId,
    role: payload.role,
    organisationId: payload.organisationId ?? null,
    subdomain: payload.subdomain ?? null,
  };
}

/**
 * Middleware Factory: Enforces that the authenticated user has one of the specified roles.
 * Returns 403 Forbidden if the user's role is not allowed.
 */
export function requireRole(allowedRoles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      return reply.status(401).send({
        success: false,
        error: "Unauthorized",
        message: "Authentication required.",
      });
    }

    if (!allowedRoles.includes(request.user.role)) {
      return reply.status(403).send({
        success: false,
        error: "Forbidden",
        message: `Access denied. Requires one of roles: [${allowedRoles.join(", ")}]. Current role: ${request.user.role}`,
      });
    }
  };
}

/**
 * Middleware: Ensures the user belongs to an organization (Tenant Super Admin, Admin, or Staff).
 * Blocks users with no organization associated (or Platform Owners using tenant-scoped endpoints).
 */
export async function requireTenantUser(request: FastifyRequest, reply: FastifyReply) {
  if (!request.user) {
    return reply.status(401).send({
      success: false,
      error: "Unauthorized",
      message: "Authentication required.",
    });
  }

  if (!request.user.organisationId) {
    return reply.status(403).send({
      success: false,
      error: "TenantContextRequired",
      message: "This operation requires an active organization context.",
    });
  }
}
