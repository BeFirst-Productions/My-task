import type { FastifyInstance } from "fastify";
import {
  getCategoriesHandler,
  getCategoryHandler,
  createCategoryHandler,
  updateCategoryHandler,
  deleteCategoryHandler,
  createSubcategoryHandler,
  updateSubcategoryHandler,
  deleteSubcategoryHandler,
  clearAllCategoriesHandler,
} from "./service.controller.js";

export async function serviceRoutes(fastify: FastifyInstance) {
  fastify.get("/", getCategoriesHandler);
  fastify.get("/:id", getCategoryHandler);
  fastify.post("/", createCategoryHandler);
  fastify.patch("/:id", updateCategoryHandler);
  fastify.delete("/:id", deleteCategoryHandler);
  fastify.delete("/all", clearAllCategoriesHandler);

  // Subcategory endpoints
  fastify.post("/:categoryId/subcategories", createSubcategoryHandler);
  fastify.patch("/subcategories/:id", updateSubcategoryHandler);
  fastify.delete("/subcategories/:id", deleteSubcategoryHandler);
}
