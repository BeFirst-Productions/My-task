import type { FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import {
  CreateEnquirySchema,
  UpdateEnquirySchema,
  EnquiryQuerySchema,
} from "./enquiry.schema.js";
import { enquiryService } from "./enquiry.service.js";

export async function createEnquiryHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const validatedData = CreateEnquirySchema.parse(request.body);
    const result = await enquiryService.createEnquiry(validatedData);

    return reply.status(201).send({
      success: true,
      message: "Enquiry submitted successfully.",
      data: result,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return reply.status(400).send({
        success: false,
        error: "ValidationError",
        message: "Invalid enquiry input data",
        details: error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    const message = error instanceof Error ? error.message : "Failed to create enquiry";
    return reply.status(500).send({
      success: false,
      error: "InternalServerError",
      message,
    });
  }
}

export async function getEnquiriesHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const validatedQuery = EnquiryQuerySchema.parse(request.query);
    const result = await enquiryService.getEnquiries(validatedQuery);

    return reply.status(200).send({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return reply.status(400).send({
        success: false,
        error: "ValidationError",
        message: "Invalid query parameters",
        details: error.issues,
      });
    }

    const message = error instanceof Error ? error.message : "Failed to fetch enquiries";
    return reply.status(500).send({
      success: false,
      error: "InternalServerError",
      message,
    });
  }
}

export async function getEnquiryStatsHandler(
  _request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const stats = await enquiryService.getEnquiryStats();
    return reply.status(200).send({
      success: true,
      data: stats,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch enquiry statistics";
    return reply.status(500).send({
      success: false,
      error: "InternalServerError",
      message,
    });
  }
}

export async function getEnquiryByIdHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const { id } = request.params;
    const enquiry = await enquiryService.getEnquiryById(id);

    if (!enquiry) {
      return reply.status(404).send({
        success: false,
        error: "NotFoundError",
        message: `Enquiry with ID "${id}" was not found.`,
      });
    }

    return reply.status(200).send({
      success: true,
      data: enquiry,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to retrieve enquiry";
    return reply.status(500).send({
      success: false,
      error: "InternalServerError",
      message,
    });
  }
}

export async function updateEnquiryHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const { id } = request.params;
    const validatedData = UpdateEnquirySchema.parse(request.body);
    const updated = await enquiryService.updateEnquiry(id, validatedData);

    return reply.status(200).send({
      success: true,
      message: "Enquiry updated successfully.",
      data: updated,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return reply.status(400).send({
        success: false,
        error: "ValidationError",
        message: "Invalid enquiry update data",
        details: error.issues,
      });
    }

    const message = error instanceof Error ? error.message : "Failed to update enquiry";
    return reply.status(500).send({
      success: false,
      error: "InternalServerError",
      message,
    });
  }
}

export async function deleteEnquiryHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const { id } = request.params;
    await enquiryService.deleteEnquiry(id);

    return reply.status(200).send({
      success: true,
      message: "Enquiry deleted successfully.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete enquiry";
    return reply.status(500).send({
      success: false,
      error: "InternalServerError",
      message,
    });
  }
}

