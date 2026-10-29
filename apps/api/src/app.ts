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
import { settingRoutes } from "./modules/setting/setting.routes.js";
import { documentRoutes } from "./modules/document/document.routes.js";
import { taskRoutes } from "./modules/task/task.routes.js";
import { tokenRoutes } from "./modules/token/token.routes.js";
import { serviceCatalogRoutes } from "./modules/service-catalog/service-catalog.routes.js";
import { clientRoutes } from "./modules/client/client.routes.js";
import { workOrderRoutes } from "./modules/work-order/work-order.routes.js";
import { proformaRoutes } from "./modules/proforma/proforma.routes.js";
import { serviceRoutes } from "./modules/service/service.routes.js";
import { notificationRoutes } from "./modules/notification/notification.routes.js";
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
  app.register(settingRoutes, { prefix: "/api/settings" });
  app.register(documentRoutes, { prefix: "/api/documents" });
  app.register(taskRoutes, { prefix: "/api/tasks" });
  app.register(tokenRoutes, { prefix: "/api/tokens" });
  app.register(serviceCatalogRoutes, { prefix: "/api/service-catalog" });
  app.register(clientRoutes, { prefix: "/api/clients" });
  app.register(workOrderRoutes, { prefix: "/api/work-orders" });
  app.register(proformaRoutes, { prefix: "/api/proforma" });
  app.register(serviceRoutes, { prefix: "/api/services" });
  app.register(notificationRoutes, { prefix: "/api/notifications" });

  return app;
}
