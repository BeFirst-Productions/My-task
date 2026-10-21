import { z } from "zod";

/**
 * Login schema for all users (Platform Owner, Super Admin, Admin, Staff)
 */
export const loginSchema = z.object({
  identifier: z
    .string({ required_error: "Username or email is required" })
    .min(3, "Please enter your username or email")
    .trim(),
  password: z
    .string({ required_error: "Password is required" })
    .min(1, "Password cannot be empty"),
});

/**
 * Change password schema
 */
export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string({ required_error: "Current password is required" })
      .min(1, "Please provide current password"),
    newPassword: z
      .string({ required_error: "New password is required" })
      .min(8, "New password must be at least 8 characters"),
    confirmNewPassword: z
      .string({ required_error: "Please confirm your new password" })
      .min(8, "Confirm password must be at least 8 characters"),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "New passwords do not match",
    path: ["confirmNewPassword"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
