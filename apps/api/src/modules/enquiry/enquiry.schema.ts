import { z } from "zod";

export const CreateEnquirySchema = z.object({
  companyName: z
    .string()
    .trim()
    .min(2, "Company Name must be at least 2 characters")
    .max(100, "Company Name must not exceed 100 characters"),
  primaryLocation: z
    .string()
    .trim()
    .min(2, "Primary Location is required"),
  subdomain: z
    .string()
    .trim()
    .min(3, "Subdomain must be at least 3 characters")
    .max(30, "Subdomain must not exceed 30 characters")
    .regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/, "Subdomain format is invalid"),
  email: z
    .string()
    .trim()
    .email("A valid email address is required"),
  mobileNumber: z
    .string()
    .trim()
    .min(7, "Mobile Number is required"),
  subscriptionPlan: z
    .string()
    .optional()
    .default("GROWTH"),
  document: z
    .string()
    .optional(), // Base64 data URL, buffer or file path
  documentName: z
    .string()
    .optional(),
  documentSize: z
    .string()
    .optional(),
  notes: z
    .string()
    .optional(),
});

export type CreateEnquiryInput = z.infer<typeof CreateEnquirySchema>;

export const UpdateEnquirySchema = z.object({
  status: z
    .enum(["PENDING", "CONTACTED", "QUALIFIED", "CONVERTED", "REJECTED"])
    .optional(),
  notes: z.string().optional(),
  companyName: z.string().trim().min(2).optional(),
  primaryLocation: z.string().trim().min(2).optional(),
  subdomain: z.string().trim().min(3).optional(),
  email: z.string().trim().email().optional(),
  mobileNumber: z.string().trim().min(7).optional(),
  subscriptionPlan: z.string().optional(),
  document: z.string().optional(),
  documentName: z.string().optional(),
  documentSize: z.string().optional(),
});

export type UpdateEnquiryInput = z.infer<typeof UpdateEnquirySchema>;

export const EnquiryQuerySchema = z.object({
  search: z.string().optional(),
  status: z.enum(["PENDING", "CONTACTED", "QUALIFIED", "CONVERTED", "REJECTED", "ALL"]).optional(),
  primaryLocation: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().default(20),
});

export type EnquiryQueryInput = z.infer<typeof EnquiryQuerySchema>;

