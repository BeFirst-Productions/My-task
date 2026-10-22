import cors from "@fastify/cors";
import type { FastifyPluginAsync } from "fastify";
import { env } from "../config/index.js";

export const corsPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(cors, {
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin) {
        callback(null, true);
        return;
      }

      // Check against configured CORS_ORIGIN or development localhost origins
      if (
        env.NODE_ENV === "development" ||
        origin === env.CORS_ORIGIN ||
        origin.startsWith("http://localhost:") ||
        origin.startsWith("http://127.0.0.1:")
      ) {
        callback(null, true);
        return;
      }

      callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Accept",
      "X-Requested-With",
      "Origin",
    ],
    exposedHeaders: ["*"],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });
};
