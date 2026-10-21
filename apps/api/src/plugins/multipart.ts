import multipart from "@fastify/multipart";
import type { FastifyPluginAsync } from "fastify";

export const multipartPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(multipart, {
    limits: {
      fieldNameSize: 100,
      fieldSize: 1000000,
      fileSize: 10 * 1024 * 1024, // 10MB
      files: 1,
    },
  });
};
