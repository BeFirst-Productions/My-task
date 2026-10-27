import { prisma } from "../../database/index.js";
import type { UpdateSettingInput } from "./setting.schema.js";
import type { Setting } from "@prisma/client";

const DEFAULT_DOC_TYPES = [
  "Trade License",
  "Employment Visa",
  "Residence Visa",
  "Municipal Permit",
  "Tenancy Contract",
  "Other",
];

/**
 * Returns or initializes the platform-wide settings (Scope: PLATFORM).
 */
export async function getPlatformSetting(): Promise<Setting> {
  let setting = await prisma.setting.findFirst({
    where: { scope: "PLATFORM", organisationId: null },
  });

  if (!setting) {
    setting = await prisma.setting.create({
      data: {
        scope: "PLATFORM",
        organisationId: null,
        displayName: "Invest First Business Platform",
        tagline: "Grow Manage Succeed Together",
        websiteUrl: "https://www.investfirst.ae",
        companyAddress: "Office 102, Business Tower, Dubai, UAE",
        logo: "/ibh-logo.png",
        supportEmail: "support@investfirst.ae",
        supportPhone: "+971 50 123 4567",
        defaultLanguage: "en",
        timezone: "Asia/Dubai",
        dateFormat: "MMM DD, YYYY",
        timeFormat: "12h",
        defaultCurrency: "AED",
        weekStart: "Sunday",
        preAlert1Days: 7,
        preAlert1Enabled: true,
        preAlert2Days: 3,
        preAlert2Enabled: true,
        preAlert3Days: 1,
        preAlert3Enabled: true,
        postAlert1Days: 1,
        postAlert1Enabled: true,
        postAlert2Days: 3,
        postAlert2Enabled: true,
        postAlert3Days: 7,
        postAlert3Enabled: true,
        defaultExpiryReminderDays: 30,
        documentTypes: DEFAULT_DOC_TYPES,
        defaultDocumentStatus: "Active",
        allowDocumentUploads: true,
        enableDocAutoNumbering: true,
        invoicePrefix: "INV",
        startingInvoiceNumber: 1001,
        defaultDueDays: 15,
        invoiceCurrency: "AED",
        taxVatRate: 5.0,
        enableVat: true,
        autoGenerateInvoiceNumber: true,
        defaultTaskPriority: "Medium",
        defaultTaskDueDays: 7,
        autoAssignTasks: false,
        enableTaskEmailNotifications: true,
        showOverdueTasksOnDashboard: true,
        themeMode: "custom",
        primaryColor: "#F59E0B",
        secondaryColor: "#6D2DCD",
        primaryFont: "Inter",
        secondaryFont: "Poppins",
        headingFont: "DM Sans",
        notificationSound: "subtle-bell",
        soundVolume: 80,
        deliveryMode: "BOTH",
        enableSystemPush: true,
        enableDashboardToast: true,
        enableSound: true,
        remind7DaysBefore: true,
        remind3DaysBefore: true,
        remind1DayBefore: true,
        remindExpiredToday: true,
        enableWhatsAppAlerts: true,
        primaryWhatsAppNumber: "+971 50 123 4567",
        secondaryWhatsAppNumbers: [],
        enableEmailAlerts: true,
        notificationEmail: "alerts@investfirst.ae",
        quietHoursEnabled: false,
        quietHoursStart: "22:00",
        quietHoursEnd: "07:00",
        autoDismissSeconds: 5,
      },
    });
  }

  return setting;
}

/**
 * Resolves an organisation by ID or subdomain.
 */
export async function resolveOrganisation(idOrSubdomain: string) {
  const org = await prisma.organisation.findFirst({
    where: {
      OR: [
        { id: idOrSubdomain },
        { subdomain: { equals: idOrSubdomain, mode: "insensitive" } },
      ],
    },
    include: {
      notificationConfig: true,
    },
  });

  return org;
}

/**
 * Returns or initializes settings for a specific organisation (Scope: ORGANISATION).
 * Fully dynamic and isolated per organization.
 */
export async function getOrganisationSetting(idOrSubdomain: string): Promise<Setting & { organisation: any }> {
  const org = await resolveOrganisation(idOrSubdomain);
  if (!org) {
    throw new Error(`Organisation "${idOrSubdomain}" not found.`);
  }

  let setting = await prisma.setting.findUnique({
    where: { organisationId: org.id },
    include: { organisation: true },
  });

  if (!setting) {
    const platformDefaults = await getPlatformSetting();

    setting = await prisma.setting.create({
      data: {
        scope: "ORGANISATION",
        organisationId: org.id,
        displayName: org.companyName || platformDefaults.displayName,
        tagline: `${org.companyName} Compliance & Operations Workspace`,
        websiteUrl: org.subdomain ? `https://${org.subdomain}.investfirst.ae` : platformDefaults.websiteUrl,
        companyAddress: org.primaryLocation || platformDefaults.companyAddress,
        logo: org.logo || null,
        supportEmail: org.notificationConfig?.notificationEmail || `admin@${org.subdomain || "org"}.ae`,
        supportPhone: org.notificationConfig?.primaryWhatsAppNumber || platformDefaults.supportPhone,
        defaultLanguage: platformDefaults.defaultLanguage,
        timezone: platformDefaults.timezone,
        dateFormat: platformDefaults.dateFormat,
        timeFormat: (platformDefaults as any).timeFormat || "12h",
        defaultCurrency: platformDefaults.defaultCurrency,
        weekStart: platformDefaults.weekStart,
        preAlert1Days: (platformDefaults as any).preAlert1Days ?? 7,
        preAlert1Enabled: (platformDefaults as any).preAlert1Enabled ?? true,
        preAlert2Days: (platformDefaults as any).preAlert2Days ?? 3,
        preAlert2Enabled: (platformDefaults as any).preAlert2Enabled ?? true,
        preAlert3Days: (platformDefaults as any).preAlert3Days ?? 1,
        preAlert3Enabled: (platformDefaults as any).preAlert3Enabled ?? true,
        postAlert1Days: (platformDefaults as any).postAlert1Days ?? 1,
        postAlert1Enabled: (platformDefaults as any).postAlert1Enabled ?? true,
        postAlert2Days: (platformDefaults as any).postAlert2Days ?? 3,
        postAlert2Enabled: (platformDefaults as any).postAlert2Enabled ?? true,
        postAlert3Days: (platformDefaults as any).postAlert3Days ?? 7,
        postAlert3Enabled: (platformDefaults as any).postAlert3Enabled ?? true,
        defaultExpiryReminderDays: platformDefaults.defaultExpiryReminderDays,
        documentTypes: platformDefaults.documentTypes ?? DEFAULT_DOC_TYPES,
        defaultDocumentStatus: platformDefaults.defaultDocumentStatus,
        allowDocumentUploads: platformDefaults.allowDocumentUploads,
        enableDocAutoNumbering: platformDefaults.enableDocAutoNumbering,
        invoicePrefix: org.subdomain ? org.subdomain.toUpperCase().slice(0, 4) : "INV",
        startingInvoiceNumber: 1001,
        defaultDueDays: 15,
        invoiceCurrency: platformDefaults.defaultCurrency,
        taxVatRate: 5.0,
        enableVat: true,
        autoGenerateInvoiceNumber: true,
        defaultTaskPriority: platformDefaults.defaultTaskPriority,
        defaultTaskDueDays: platformDefaults.defaultTaskDueDays,
        autoAssignTasks: false,
        enableTaskEmailNotifications: true,
        showOverdueTasksOnDashboard: true,
        themeMode: "light",
        primaryColor: "#3B82F6",
        secondaryColor: "#6D2DCD",
        primaryFont: "Inter",
        secondaryFont: "Poppins",
        headingFont: "DM Sans",
        notificationSound: "modern-ping",
        soundVolume: 80,
        deliveryMode: "BOTH",
        enableSystemPush: true,
        enableDashboardToast: true,
        enableSound: true,
        remind7DaysBefore: true,
        remind3DaysBefore: true,
        remind1DayBefore: true,
        remindExpiredToday: true,
        enableWhatsAppAlerts: org.notificationConfig?.isWhatsAppEnabled ?? true,
        primaryWhatsAppNumber: org.notificationConfig?.primaryWhatsAppNumber || null,
        secondaryWhatsAppNumbers: [],
        enableEmailAlerts: org.notificationConfig?.isEmailEnabled ?? true,
        notificationEmail: org.notificationConfig?.notificationEmail || null,
        quietHoursEnabled: false,
        quietHoursStart: "22:00",
        quietHoursEnd: "07:00",
        autoDismissSeconds: 5,
      },
      include: { organisation: true },
    });
  }

  return setting;
}

/**
 * Updates platform-wide settings (reflects on Platform Owner dashboard & system defaults).
 */
export async function updatePlatformSetting(
  input: UpdateSettingInput,
  userId?: string
): Promise<Setting> {
  const current = await getPlatformSetting();

  const updated = await prisma.setting.update({
    where: { id: current.id },
    data: {
      ...input,
      updatedById: userId || null,
    },
  });

  return updated;
}

/**
 * Updates an organization's specific settings (reflects strictly on that organization & users).
 */
export async function updateOrganisationSetting(
  idOrSubdomain: string,
  input: UpdateSettingInput,
  userId?: string
): Promise<Setting & { organisation: any }> {
  const current = await getOrganisationSetting(idOrSubdomain);

  const updated = await prisma.setting.update({
    where: { id: current.id },
    data: {
      ...input,
      updatedById: userId || null,
    },
    include: { organisation: true },
  });

  // If organization logo was updated, also keep organisation table in sync
  if (input.logo !== undefined && current.organisationId) {
    await prisma.organisation.update({
      where: { id: current.organisationId },
      data: { logo: input.logo },
    });
  }

  // If organization company name was updated, keep organisation table in sync
  if (input.displayName && current.organisationId) {
    await prisma.organisation.update({
      where: { id: current.organisationId },
      data: { companyName: input.displayName },
    });
  }

  return updated;
}
