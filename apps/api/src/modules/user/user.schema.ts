import { z } from "zod";

/**
 * Roles assignable by an Organisation Super Admin / Admin
 */
export const assignableRolesEnum = z.enum(["SUPER_ADMIN", "ADMIN", "STAFF"]);

/**
 * All platform & organization roles
 */
export const allRolesEnum = z.enum(["PLATFORM_OWNER", "SUPER_ADMIN", "ADMIN", "STAFF"]);

/**
 * User account status
 */
export const userStatusEnum = z.enum(["ACTIVE", "INACTIVE", "SUSPENDED", "INVITED"]);

/**
 * Schema for an Organisation Super Admin / Admin creating an internal user
 * Note: organisationId is intentionally omitted; it is securely injected by middleware from the authenticated JWT session!
 */
export const createTenantUserSchema = z.object({
  fullName: z
    .string({ required_error: "Full name is required" })
    .min(2, "Full name must be at least 2 characters")
    .trim(),
  email: z
    .string({ required_error: "Email is required" })
    .email("Please provide a valid email address")
    .toLowerCase()
    .trim(),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username cannot exceed 30 characters")
    .regex(/^[a-zA-Z0-9_.-]+$/, "Username can only contain letters, numbers, underscores, and dashes")
    .toLowerCase()
    .trim()
    .optional(),
  phoneNumber: z
    .string({ required_error: "Phone number is required" })
    .min(6, "Please provide a valid phone number")
    .trim(),
  password: z
    .string({ required_error: "Password is required" })
    .min(8, "Password must be at least 8 characters"),
  role: assignableRolesEnum.default("STAFF"),
  status: userStatusEnum.default("ACTIVE").optional(),
  department: z.string().trim().optional(),
  designation: z.string().trim().optional(),
  customPermissions: z.record(z.string(), z.array(z.string())).optional().nullable(),
});

/**
 * Backward compatibility alias
 */
export const createUserSchema = createTenantUserSchema.extend({
  organisationId: z.string().uuid("Invalid organisation ID").optional(),
});

/**
 * Schema for updating an existing tenant user's details
 */
export const updateTenantUserSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters").trim().optional(),
  phoneNumber: z.string().min(6, "Phone number must be at least 6 characters").trim().optional(),
  role: assignableRolesEnum.optional(),
  status: userStatusEnum.optional(),
  department: z.string().trim().optional(),
  designation: z.string().trim().optional(),
  password: z.string().min(8, "Password must be at least 8 characters").optional(),
  customPermissions: z.record(z.string(), z.array(z.string())).optional().nullable(),
});

export const updateUserSchema = updateTenantUserSchema;

/**
 * Schema for Platform Owner creating a user (e.g., cross-tenant or platform level)
 */
export const createPlatformUserSchema = z.object({
  fullName: z.string().min(2).trim(),
  email: z.string().email().toLowerCase().trim(),
  username: z.string().min(3).max(30).trim(),
  phoneNumber: z.string().min(6).trim(),
  password: z.string().min(8),
  role: allRolesEnum.default("STAFF"),
  organisationId: z.string().uuid().optional(),
  department: z.string().trim().optional(),
  designation: z.string().trim().optional(),
});

/**
 * Schema for listing/filtering users
 */
export const userQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().trim().optional(),
  role: allRolesEnum.optional(),
  status: userStatusEnum.optional(),
  department: z.string().trim().optional(),
});

/**
 * Status toggle schema
 */
export const updateUserStatusSchema = z.object({
  status: userStatusEnum,
});

export type CreateTenantUserInput = z.infer<typeof createTenantUserSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateTenantUserInput = z.infer<typeof updateTenantUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type CreatePlatformUserInput = z.infer<typeof createPlatformUserSchema>;
export type UserQueryInput = z.infer<typeof userQuerySchema>;
export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>;
