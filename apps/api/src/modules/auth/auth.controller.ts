import type { FastifyReply, FastifyRequest } from "fastify";
import { loginSchema } from "./auth.schema.js";
import { authenticateUser, ensureDefaultAccounts, getMe } from "./auth.service.js";
import { verifyToken } from "./auth.utils.js";

export async function loginHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const parseResult = loginSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        success: false,
        error: "ValidationFailed",
        message: parseResult.error.errors.map((e) => e.message).join(", "),
      });
    }

    const result = await authenticateUser(parseResult.data);

    return reply.status(200).send({
      success: true,
      message: "Authentication successful",
      data: result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Authentication failed";
    const statusCode =
      message.includes("suspended") || message.includes("inactive") ? 403 : 401;

    return reply.status(statusCode).send({
      success: false,
      error: "AuthenticationError",
      message,
    });
  }
}

export async function getMeHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return reply.status(401).send({
        success: false,
        error: "Unauthorized",
        message: "Missing or invalid authorization token",
      });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    if (!decoded || !decoded.userId) {
      return reply.status(401).send({
        success: false,
        error: "Unauthorized",
        message: "Token is invalid or has expired",
      });
    }

    const user = await getMe(decoded.userId);

    return reply.status(200).send({
      success: true,
      data: user,
    });
  } catch (error) {
    return reply.status(401).send({
      success: false,
      error: "Unauthorized",
      message: error instanceof Error ? error.message : "Session expired",
    });
  }
}

export async function seedHandler(_request: FastifyRequest, reply: FastifyReply) {
  try {
    await ensureDefaultAccounts();
    return reply.status(200).send({
      success: true,
      message: "Seed accounts checked and ensured",
    });
  } catch (error) {
    return reply.status(500).send({
      success: false,
      error: "SeedError",
      message: error instanceof Error ? error.message : "Failed to seed accounts",
    });
  }
}
