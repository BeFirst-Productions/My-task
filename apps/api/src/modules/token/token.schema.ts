import { z } from "zod";

export const tokenCategoryEnum = z.enum([
  "DOMAIN_CHANGE",
  "TECHNICAL_SUPPORT",
  "BILLING_PLAN",
  "FEATURE_REQUEST",
  "ACCESS_PERMISSION",
  "CUSTOM",
]);

export const tokenPriorityEnum = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);

export const tokenStatusEnum = z.enum([
  "OPEN",
  "IN_REVIEW",
  "APPROVED",
  "REJECTED",
  "RESOLVED",
  "CLOSED",
]);

export const createTokenInputSchema = z.object({
  category: tokenCategoryEnum.default("CUSTOM"),
  customCategory: z.string().trim().optional(),
  priority: tokenPriorityEnum.default("MEDIUM"),
  subject: z.string().trim().min(3, "Subject must be at least 3 characters").max(200),
  description: z.string().trim().min(5, "Description must be at least 5 characters"),
  currentDomain: z.string().trim().optional(),
  requestedDomain: z.string().trim().optional(),
});

export const updateTokenStatusSchema = z.object({
  status: tokenStatusEnum,
  resolutionNotes: z.string().trim().optional(),
  approveDomainChange: z.boolean().optional(),
});

export const addTokenMessageSchema = z.object({
  message: z.string().trim().min(1, "Message cannot be empty"),
});

export type CreateTokenInput = z.infer<typeof createTokenInputSchema>;
export type UpdateTokenStatusInput = z.infer<typeof updateTokenStatusSchema>;
export type AddTokenMessageInput = z.infer<typeof addTokenMessageSchema>;
