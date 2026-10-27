import { z } from "zod";

export const updateSettingInputSchema = z.object({
  // General Platform / Org Information
  displayName: z.string().min(1, "Name is required").optional(),
  tagline: z.string().nullable().optional(),
  websiteUrl: z.string().nullable().optional(),
  companyAddress: z.string().nullable().optional(),
  logo: z.string().nullable().optional(),
  supportEmail: z.string().email("Valid email required").nullable().optional(),
  supportPhone: z.string().nullable().optional(),

  // Regional / Time & Date Settings
  defaultLanguage: z.string().optional(),
  timezone: z.string().optional(),
  dateFormat: z.string().optional(),
  timeFormat: z.enum(["12h", "24h"]).optional(),
  defaultCurrency: z.string().optional(),
  weekStart: z.string().optional(),

  // Document Expiry Alert Settings (3 Pre-Alerts & 3 Post-Alerts)
  preAlert1Days: z.number().int().min(1).max(365).optional(),
  preAlert1Enabled: z.boolean().optional(),
  preAlert2Days: z.number().int().min(1).max(365).optional(),
  preAlert2Enabled: z.boolean().optional(),
  preAlert3Days: z.number().int().min(1).max(365).optional(),
  preAlert3Enabled: z.boolean().optional(),

  postAlert1Days: z.number().int().min(1).max(365).optional(),
  postAlert1Enabled: z.boolean().optional(),
  postAlert2Days: z.number().int().min(1).max(365).optional(),
  postAlert2Enabled: z.boolean().optional(),
  postAlert3Days: z.number().int().min(1).max(365).optional(),
  postAlert3Enabled: z.boolean().optional(),

  // Legacy Document Settings
  defaultExpiryReminderDays: z.number().int().min(1).max(365).optional(),
  documentTypes: z.array(z.string()).optional(),
  defaultDocumentStatus: z.string().optional(),
  allowDocumentUploads: z.boolean().optional(),
  enableDocAutoNumbering: z.boolean().optional(),

  // Invoice Settings (Default invoicing configuration)
  invoicePrefix: z.string().min(1).max(10).optional(),
  startingInvoiceNumber: z.number().int().min(1).optional(),
  defaultDueDays: z.number().int().min(1).max(180).optional(),
  invoiceCurrency: z.string().optional(),
  taxVatRate: z.number().min(0).max(100).optional(),
  enableVat: z.boolean().optional(),
  autoGenerateInvoiceNumber: z.boolean().optional(),

  // Task Settings
  defaultTaskPriority: z.enum(["Low", "Medium", "High", "Urgent"]).optional(),
  defaultTaskDueDays: z.number().int().min(1).max(180).optional(),
  autoAssignTasks: z.boolean().optional(),
  enableTaskEmailNotifications: z.boolean().optional(),
  showOverdueTasksOnDashboard: z.boolean().optional(),

  // Theme Customization
  themeMode: z.enum(["light", "dark", "custom"]).optional(),
  primaryColor: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Invalid primary color hex").optional(),
  secondaryColor: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Invalid secondary color hex").optional(),
  primaryFont: z.string().optional(),
  secondaryFont: z.string().optional(),
  headingFont: z.string().optional(),
  customCss: z.string().nullable().optional(),

  // Notification Settings
  notificationSound: z.string().optional(),
  soundVolume: z.number().int().min(0).max(100).optional(),
  deliveryMode: z.enum(["DASHBOARD_ONLY", "SYSTEM_ONLY", "BOTH"]).optional(),
  enableSystemPush: z.boolean().optional(),
  enableDashboardToast: z.boolean().optional(),
  enableSound: z.boolean().optional(),
  remind7DaysBefore: z.boolean().optional(),
  remind3DaysBefore: z.boolean().optional(),
  remind1DayBefore: z.boolean().optional(),
  remindExpiredToday: z.boolean().optional(),
  enableWhatsAppAlerts: z.boolean().optional(),
  primaryWhatsAppNumber: z.string().nullable().optional(),
  secondaryWhatsAppNumbers: z.array(z.string()).optional(),
  enableEmailAlerts: z.boolean().optional(),
  notificationEmail: z.string().email().nullable().optional(),
  quietHoursEnabled: z.boolean().optional(),
  quietHoursStart: z.string().nullable().optional(),
  quietHoursEnd: z.string().nullable().optional(),
  autoDismissSeconds: z.number().int().min(1).max(60).optional(),
});

export type UpdateSettingInput = z.infer<typeof updateSettingInputSchema>;
