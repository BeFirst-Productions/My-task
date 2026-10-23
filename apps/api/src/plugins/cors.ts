import cors from "@fastify/cors";
import type { FastifyPluginAsync } from "fastify";
import { env } from "../config/index.js";

const ALLOWED_ORIGINS = [
  "https://my-task-git-main-befirst-productions-projects.vercel.app",
];

export const corsPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(cors, {
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin) {
        callback(null, true);
        return;
      }

      const cleanOrigin = origin.replace(/\/$/, "");

      // Support comma-separated CORS_ORIGIN in env
      const configuredOrigins = env.CORS_ORIGIN
        ? env.CORS_ORIGIN.split(",").map((o) => o.trim().replace(/\/$/, ""))
        : [];

      // Check against configured CORS_ORIGIN, static allowed origins, or development localhost origins
      if (
        env.NODE_ENV === "development" ||
        configuredOrigins.includes(cleanOrigin) ||
        ALLOWED_ORIGINS.includes(cleanOrigin) ||
        cleanOrigin.endsWith(".vercel.app") ||
        cleanOrigin.startsWith("http://localhost:") ||
        cleanOrigin.startsWith("http://127.0.0.1:")
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
