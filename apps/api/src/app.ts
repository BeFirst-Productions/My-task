import Fastify, {
  type FastifyError,
  type FastifyInstance,
  type FastifyServerOptions,
} from "fastify";
import { corsPlugin } from "./plugins/cors.js";
import { sensiblePlugin } from "./plugins/sensible.js";
import { morganPlugin } from "./plugins/morgan.js";
import multipart from "@fastify/multipart";
import { healthRoutes } from "./modules/health/health.routes.js";
import { organisationRoutes } from "./modules/organization/organization.routes.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { tenantUserRoutes, platformUserRoutes } from "./modules/user/user.routes.js";
import { documentRoutes } from "./modules/document/document.routes.js";
import { taskRoutes } from "./modules/task/task.routes.js";
import { env } from "./config/index.js";

export function buildApp(options: FastifyServerOptions = {}): FastifyInstance {
  const app = Fastify({
    bodyLimit: 15 * 1024 * 1024, // 15MB limit for document uploads & payloads
    disableRequestLogging: true,
    logger: {
      level: env.NODE_ENV === "production" ? "info" : "debug",
      // Redact sensitive headers and query params from logs
      redact: ["req.headers.authorization", "req.headers.cookie"],
    },
    ...options,
  });

  // Central error handler to avoid leaking internal stack traces in responses
  app.setErrorHandler((error: FastifyError, request, reply) => {
    request.log.error(error);

    const statusCode = error.statusCode ?? 500;
    const isClientError = statusCode >= 400 && statusCode < 500;

    return reply.status(statusCode).send({
      statusCode,
      error: error.name || "InternalServerError",
      message: isClientError ? error.message : "An unexpected error occurred",
    });
  });

  // Register core plugins
  app.register(sensiblePlugin);
  app.register(corsPlugin);
  app.register(morganPlugin);
  app.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
      files: 1,
    },
  });

  // Register API routes
  app.register(healthRoutes, { prefix: "/api" });
  app.register(organisationRoutes, { prefix: "/api/organisations" });
  app.register(authRoutes, { prefix: "/api/auth" });
  app.register(tenantUserRoutes, { prefix: "/api/org/users" });
  app.register(platformUserRoutes, { prefix: "/api/platform/users" });
  app.register(documentRoutes, { prefix: "/api/documents" });
  app.register(taskRoutes, { prefix: "/api/tasks" });

  return app;
}
