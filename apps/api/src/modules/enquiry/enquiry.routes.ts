import type { FastifyPluginAsync } from "fastify";
import {
  createEnquiryHandler,
  getEnquiriesHandler,
  getEnquiryStatsHandler,
  getEnquiryByIdHandler,
  updateEnquiryHandler,
  deleteEnquiryHandler,
} from "./enquiry.controller.js";

export const enquiryRoutes: FastifyPluginAsync = async (fastify) => {
  // Public: Landing page form submission or Platform Owner manual create
  fastify.post("/", createEnquiryHandler);

  // List all enquiries with pagination, filters, and keyword search
  fastify.get("/", getEnquiriesHandler);

  // Get aggregated stats
  fastify.get("/stats", getEnquiryStatsHandler);

  // Get single enquiry by ID
  fastify.get("/:id", getEnquiryByIdHandler);

  // Update enquiry status, notes, or details
  fastify.patch("/:id", updateEnquiryHandler);

  // Delete enquiry
  fastify.delete("/:id", deleteEnquiryHandler);
};

