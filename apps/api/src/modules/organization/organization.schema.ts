import { z } from "zod";

/**
 * Company / Organisation Details Schema
 * Contains only the fields from the new profile setup form:
 * 1. Company Name
 * 2. Primary Location (Emirate)
 * 3. Software Subdomain
 * 4. Company Logo
 * 5. Document Upload
 */
export const baseCompanyDetailsSchema = z.object({
  companyName: z
    .string()
    .min(2, "Company Name must be at least 2 characters")
    .max(100, "Company Name cannot exceed 100 characters")
    .trim()
    .optional(),
  name: z.string().trim().optional(),
  primaryLocation: z
    .string({ required_error: "Primary Location is required" })
    .min(1, "Please select an Emirate")
    .trim(),
  subdomain: z
    .string({ required_error: "Software Subdomain is required" })
    .min(3, "Subdomain must be at least 3 characters")
    .max(30, "Subdomain cannot exceed 30 characters")
    .regex(
      /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/,
      "Subdomain must contain only lowercase letters, numbers, and hyphens (cannot start or end with a hyphen)"
    )
    .trim(),
  logo: z.string().optional().or(z.literal("")),
  document: z.string().optional().or(z.literal("")),
});

export const companyDetailsSchema = baseCompanyDetailsSchema
  .transform((data) => {
    const resolved = (data.companyName || data.name || "").trim();
    return {
      ...data,
      companyName: resolved,
      name: resolved,
    };
  })
  .refine((data) => data.companyName.length >= 2, {
    message: "Company Name must be at least 2 characters",
    path: ["companyName"],
  });

/**
 * Super Admin Account Details Schema
 * Matches Account Access fields from the form:
 * 1. Verified Email
 * 2. Mobile Number (UAE validated)
 * 3. Superadmin Username
 * 4. Password
 * 5. Confirm Password
 */
export const superAdminDetailsSchema = z
  .object({
    email: z
      .string({ required_error: "Email address is required" })
      .email("Please enter a valid email address")
      .toLowerCase()
      .trim(),
    phoneNumber: z
      .string({ required_error: "Mobile number is required" })
      .trim()
      .refine(
        (val) => {
          const cleaned = val.replace(/[\s\-\(\)\.]/g, "");
          return /^(?:(?:\+971|00971|0)?)(5[024568]\d{7}|5\d{8})$/.test(cleaned);
        },
        {
          message:
            "Please enter a valid UAE mobile number (e.g. 050 123 4567 or +971 50 123 4567)",
        }
      ),
    username: z
      .string({ required_error: "Superadmin Username is required" })
      .min(3, "Username must be at least 3 characters")
      .max(30, "Username cannot exceed 30 characters")
      .regex(
        /^[a-zA-Z0-9_.-]+$/,
        "Username can only contain letters, numbers, underscores, and dashes"
      )
      .toLowerCase()
      .trim(),
    password: z
      .string({ required_error: "Password is required" })
      .min(8, "Password must be at least 8 characters"),
    confirmPassword: z
      .string({ required_error: "Confirm password is required" })
      .min(8, "Confirm password must be at least 8 characters"),
    fullName: z.string().trim().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

/**
 * Complete Organisation Creation Payload
 */
export const createOrganisationSchema = z.object({
  companyDetails: companyDetailsSchema,
  superAdminDetails: superAdminDetailsSchema,
});

export const updateOrganisationSchema = baseCompanyDetailsSchema.partial();

export const organisationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().trim().optional(),
  status: z.enum(["PENDING", "ACTIVE", "INACTIVE", "SUSPENDED"]).optional(),
});

export type CreateOrganisationInput = z.infer<typeof createOrganisationSchema>;
export type UpdateOrganisationInput = z.infer<typeof updateOrganisationSchema>;
export type CompanyDetailsInput = z.infer<typeof companyDetailsSchema>;
export type SuperAdminDetailsInput = z.infer<typeof superAdminDetailsSchema>;
export type OrganisationQueryInput = z.infer<typeof organisationQuerySchema>;
