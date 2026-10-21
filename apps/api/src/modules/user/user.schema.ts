import { z } from "zod";

/**
 * Roles assignable by an Organisation's Super Admin / Admin
 */
export const assignableRolesEnum = z.enum(["ADMIN", "STAFF"]);
export const allRolesEnum = z.enum(["PLATFORM_OWNER", "SUPER_ADMIN", "ADMIN", "STAFF"]);
export const userStatusEnum = z.enum(["ACTIVE", "INACTIVE", "SUSPENDED", "INVITED"]);

/**
 * Schema for Organisation Super Admin / Admin adding a new user (Staff / Admin)
 */
export const createUserSchema = z.object({
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
    .string({ required_error: "Username is required" })
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username cannot exceed 30 characters")
    .regex(/^[a-zA-Z0-9_.-]+$/, "Username can only contain letters, numbers, underscores, and dashes")
    .toLowerCase()
    .trim(),
  phoneNumber: z
    .string({ required_error: "Phone number is required" })
    .min(6, "Please provide a valid phone number")
    .trim(),
  password: z
    .string({ required_error: "Password is required" })
    .min(8, "Password must be at least 8 characters"),
  role: assignableRolesEnum.default("STAFF"),
  department: z.string().trim().optional(),
  designation: z.string().trim().optional(),
  organisationId: z.string().uuid("Invalid organisation ID").optional(),
});

/**
 * Schema for updating an existing user's details
 */
export const updateUserSchema = z.object({
  fullName: z.string().min(2).trim().optional(),
  phoneNumber: z.string().min(6).trim().optional(),
  role: assignableRolesEnum.optional(),
  status: userStatusEnum.optional(),
  department: z.string().trim().optional(),
  designation: z.string().trim().optional(),
});

/**
 * Schema for listing/filtering users within an organisation
 */
export const userQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().trim().optional(),
  role: allRolesEnum.optional(),
  status: userStatusEnum.optional(),
  department: z.string().trim().optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UserQueryInput = z.infer<typeof userQuerySchema>;
