import type { FastifyPluginAsync } from "fastify";
import middie from "@fastify/middie";
import morgan from "morgan";

export const morganPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(middie);
  fastify.use(morgan("dev"));
};
