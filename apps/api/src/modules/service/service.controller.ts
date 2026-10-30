import type { FastifyReply, FastifyRequest } from "fastify";
import * as serviceService from "./service.service.js";
import {
  CreateCategorySchema,
  UpdateCategorySchema,
  CreateSubcategorySchema,
  UpdateSubcategorySchema,
} from "./service.schema.js";

export async function getCategoriesHandler(request: FastifyRequest, reply: FastifyReply) {
  const query = request.query as { organisationId?: string };
  const categories = await serviceService.listCategories(query.organisationId);
  return reply.send({ success: true, data: categories });
}

export async function getCategoryHandler(request: FastifyRequest, reply: FastifyReply) {
  const params = request.params as { id: string };
  const category = await serviceService.getCategoryById(params.id);
  if (!category) {
    return reply.status(404).send({ success: false, message: "Category not found" });
  }
  return reply.send({ success: true, data: category });
}

export async function createCategoryHandler(request: FastifyRequest, reply: FastifyReply) {
  const query = request.query as { organisationId?: string };
  const body = CreateCategorySchema.parse(request.body);
  const category = await serviceService.createCategory(body, query.organisationId);
  return reply.status(201).send({ success: true, data: category });
}

export async function updateCategoryHandler(request: FastifyRequest, reply: FastifyReply) {
  const params = request.params as { id: string };
  const body = UpdateCategorySchema.parse(request.body);
  const category = await serviceService.updateCategory(params.id, body);
  return reply.send({ success: true, data: category });
}

export async function deleteCategoryHandler(request: FastifyRequest, reply: FastifyReply) {
  const params = request.params as { id: string };
  const result = await serviceService.deleteCategory(params.id);
  return reply.send(result);
}

export async function createSubcategoryHandler(request: FastifyRequest, reply: FastifyReply) {
  const params = request.params as { categoryId: string };
  const body = CreateSubcategorySchema.parse(request.body);
  const updatedCategory = await serviceService.createSubcategory(params.categoryId, body);
  return reply.status(201).send({ success: true, data: updatedCategory });
}

export async function updateSubcategoryHandler(request: FastifyRequest, reply: FastifyReply) {
  const params = request.params as { id: string };
  const body = UpdateSubcategorySchema.parse(request.body);
  const updatedCategory = await serviceService.updateSubcategory(params.id, body);
  return reply.send({ success: true, data: updatedCategory });
}

export async function deleteSubcategoryHandler(request: FastifyRequest, reply: FastifyReply) {
  const params = request.params as { id: string };
  const updatedCategory = await serviceService.deleteSubcategory(params.id);
  return reply.send({ success: true, data: updatedCategory });
}

export async function clearAllCategoriesHandler(request: FastifyRequest, reply: FastifyReply) {
  const query = request.query as { organisationId?: string };
  const result = await serviceService.clearAllCategories(query.organisationId);
  return reply.send(result);
}
