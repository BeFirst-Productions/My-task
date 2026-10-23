import { z } from "zod";

/**
 * Document Type Enum matching standard compliance and corporate documents
 */
export const DocumentTypeEnum = z.enum([
  "TRADE_LICENSE",
  "COMMERCIAL_PERMIT",
  "VISA",
  "PASSPORT",
  "EMIRATES_ID",
  "TENANCY_CONTRACT",
  "MEMORANDUM_OF_ASSOCIATION",
  "TAX_REGISTRATION_CERTIFICATE",
  "LABOUR_ESTABLISHMENT_CARD",
  "INSURANCE_POLICY",
  "POWER_OF_ATTORNEY",
  "OTHER",
]);

export type DocumentType = z.infer<typeof DocumentTypeEnum>;

/**
 * Document Status Enum
 */
export const DocumentStatusEnum = z.enum([
  "ACTIVE",
  "DRAFT",
  "EXPIRING_SOON",
  "EXPIRED",
  "RENEWAL_IN_PROGRESS",
  "ARCHIVED",
]);

export type DocumentStatus = z.infer<typeof DocumentStatusEnum>;

/**
 * Add / Create New Document Schema
 * Accurately models the "Add New Document" UI form:
 * - Client & Company Details
 * - Document Information
 * - Document Upload (Max 5MB)
 */
export const createDocumentSchema = z.object({
  // Section 1: Client & Company Details
  clientId: z.string().optional(),
  clientName: z.string().optional(),
  companyName: z.string().optional(),
  assignedPerson: z.string().min(2, "Assigned person name must be at least 2 characters").optional(),
  organisationId: z
    .string({ required_error: "Company selection is required" })
    .min(1, "Company selection is required"),

  // Section 2: Document Information
  documentType: DocumentTypeEnum.default("TRADE_LICENSE"),
  documentName: z
    .string({ required_error: "Document name is required" })
    .min(2, "Document name must be at least 2 characters")
    .max(150, "Document name cannot exceed 150 characters")
    .trim(),
  issuingAuthority: z
    .string()
    .max(150, "Issuing authority cannot exceed 150 characters")
    .trim()
    .optional(),
  issueDate: z
    .string()
    .datetime({ offset: true })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Issue date must be YYYY-MM-DD"))
    .optional()
    .nullable(),
  expiryDate: z
    .string()
    .datetime({ offset: true })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expiry date must be YYYY-MM-DD"))
    .optional()
    .nullable(),
  status: DocumentStatusEnum.default("ACTIVE"),
  description: z
    .string()
    .max(500, "Description cannot exceed 500 characters")
    .optional()
    .nullable(),

  // Section 3: Document URL (Stored in Bunny CDN Storage)
  documentUrl: z
    .string({ required_error: "Document URL (Bunny CDN) is required" })
    .url("Document URL must be a valid Bunny CDN URL")
    .or(z.string().min(1, "Document URL is required")),
});

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;

/**
 * Update Document Schema
 */
export const updateDocumentSchema = createDocumentSchema.partial();
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;

/**
 * Document Query / Filter Schema
 */
export const documentQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().optional(),
  organisationId: z.string().trim().optional(),
  clientId: z.string().trim().optional(),
  documentType: DocumentTypeEnum.optional(),
  status: DocumentStatusEnum.optional(),
  expiringInDays: z.coerce.number().int().positive().optional(),
});

export type DocumentQueryParams = z.infer<typeof documentQuerySchema>;
