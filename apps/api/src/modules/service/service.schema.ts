import { z } from "zod";

export const CreateSubcategorySchema = z.object({
  name: z.string().min(1, "Subcategory name is required"),
  price: z.number().min(0, "Price must be a positive number"),
  currency: z.string().default("AED"),
  description: z.string().optional().default(""),
  governmentFee: z.number().optional(),
  serviceFee: z.number().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

export const UpdateSubcategorySchema = CreateSubcategorySchema.partial();

export const CreateCategorySchema = z.object({
  organisationId: z.string().optional(),
  name: z.string().min(1, "Category name is required"),
  code: z.string().optional(),
  description: z.string().optional().default(""),
  department: z.string().optional().default("General"),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
  subcategories: z.array(CreateSubcategorySchema).optional().default([]),
});

export const UpdateCategorySchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().optional(),
  description: z.string().optional(),
  department: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  subcategories: z
    .array(
      CreateSubcategorySchema.extend({
        id: z.string().optional(),
      })
    )
    .optional(),
});

export type CreateSubcategoryDTO = z.infer<typeof CreateSubcategorySchema>;
export type UpdateSubcategoryDTO = z.infer<typeof UpdateSubcategorySchema>;
export type CreateCategoryDTO = z.infer<typeof CreateCategorySchema>;
export type UpdateCategoryDTO = z.infer<typeof UpdateCategorySchema>;
