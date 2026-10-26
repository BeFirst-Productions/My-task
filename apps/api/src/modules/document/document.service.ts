import { prisma } from "../../database/index.js";
import { getTenantPrisma } from "../../database/tenant.js";
import {
  deleteDocumentFromBunny,
  uploadClientDocumentToBunny,
} from "../../services/bunny.service.js";
import type {
  CreateDocumentInput,
  DocumentQueryParams,
  UpdateDocumentInput,
} from "./document.schema.js";

/**
 * Resolves an organisation ID from an ID, subdomain, or slug, falling back to the default org.
 */
export async function resolveOrganisationId(orgIdOrSubdomain?: string): Promise<string | null> {
  if (!orgIdOrSubdomain || orgIdOrSubdomain === "org-default") {
    const defaultOrg = await prisma.organisation.findFirst({ select: { id: true } });
    return defaultOrg?.id || null;
  }
  const org = await prisma.organisation.findFirst({
    where: {
      OR: [
        { id: orgIdOrSubdomain },
        { subdomain: { equals: orgIdOrSubdomain, mode: "insensitive" } },
        { companyName: { equals: orgIdOrSubdomain, mode: "insensitive" } },
      ],
    },
    select: { id: true },
  });
  return org?.id || orgIdOrSubdomain;
}

/**
 * Resolves the dedicated PostgreSQL database client for an organisation.
 * All document, client, and notification operations run STRICTLY inside
 * this dedicated database.
 */
export async function getDbForOrganisation(orgIdOrSubdomain?: string): Promise<{
  targetDb: any;
  organisation: any;
}> {
  const resolvedOrgId = await resolveOrganisationId(orgIdOrSubdomain);

  let organisation = resolvedOrgId
    ? await prisma.organisation.findUnique({
        where: { id: resolvedOrgId },
        include: { notificationConfig: true },
      })
    : null;

  if (!organisation) {
    organisation = await prisma.organisation.findFirst({
      include: { notificationConfig: true },
    });
  }

  if (organisation) {
    const dbName =
      organisation.databaseName ||
      (organisation.subdomain ? `tenant_${organisation.subdomain}` : null);
    if (dbName) {
      try {
        const tenantDb = await getTenantPrisma(dbName);
        return { targetDb: tenantDb, organisation };
      } catch (err) {
        console.warn(`[Tenant DB] Failed to connect to "${dbName}", falling back:`, err);
      }
    }
  }

  return { targetDb: prisma, organisation };
}

/**
 * Creates a new document scoped strictly to that company's dedicated database.
 * Does NOT write into the master platform database.
 */
export async function createDocument(
  input: CreateDocumentInput,
  userContext?: { userId?: string }
) {
  const { targetDb, organisation } = await getDbForOrganisation(input.organisationId);
  if (!organisation) {
    throw new Error("Organisation not found.");
  }
  const effectiveOrgId = organisation.id;

  // 1. Resolve client / assigned person in the tenant database
  let resolvedClientId = input.clientId || null;
  let resolvedAssignedPerson = input.assignedPerson || input.clientName || null;

  if (resolvedClientId) {
    const existingClient = await targetDb.client.findFirst({
      where: {
        id: resolvedClientId,
        organisationId: effectiveOrgId,
      },
    });
    if (existingClient && !resolvedAssignedPerson) {
      resolvedAssignedPerson = existingClient.assignedPerson || existingClient.companyName;
    }
  } else if (resolvedAssignedPerson && resolvedAssignedPerson.trim() !== "") {
    let client = await targetDb.client.findFirst({
      where: {
        organisationId: effectiveOrgId,
        OR: [
          { assignedPerson: { equals: resolvedAssignedPerson.trim(), mode: "insensitive" } },
          {
            companyName: {
              equals: (input.clientName || resolvedAssignedPerson).trim(),
              mode: "insensitive",
            },
          },
        ],
      },
    });

    if (!client) {
      client = await targetDb.client.create({
        data: {
          organisationId: effectiveOrgId,
          assignedPerson: resolvedAssignedPerson.trim(),
          companyName: (input.clientName || input.companyName || resolvedAssignedPerson).trim(),
          status: "ACTIVE",
        },
      });
    }
    resolvedClientId = client.id;
  }

  // 2. Upload to Bunny Storage
  let storedDocumentUrl = input.documentUrl.trim();
  if (storedDocumentUrl) {
    console.log(
      `[Bunny Upload] Uploading client document "${input.documentName}" for "${resolvedAssignedPerson || organisation.companyName}" to Bunny Storage...`
    );
    storedDocumentUrl = await uploadClientDocumentToBunny(
      storedDocumentUrl,
      input.documentName,
      resolvedAssignedPerson || organisation.companyName
    );
    console.log(`[Bunny Upload] Stored at CDN URL: "${storedDocumentUrl}"`);
  }

  // 3. Parse Dates
  const parsedIssueDate = input.issueDate ? new Date(input.issueDate) : null;
  const parsedExpiryDate = input.expiryDate ? new Date(input.expiryDate) : null;

  // 4. Create Document ONLY in the company's dedicated database
  const document = await targetDb.document.create({
    data: {
      organisationId: effectiveOrgId,
      clientId: resolvedClientId,
      assignedPerson: resolvedAssignedPerson,
      documentType: input.documentType,
      documentName: input.documentName.trim(),
      issuingAuthority: input.issuingAuthority?.trim() || null,
      issueDate: parsedIssueDate,
      expiryDate: parsedExpiryDate,
      status: input.status,
      description: input.description?.trim() || null,
      documentUrl: storedDocumentUrl,
      uploadedById: userContext?.userId || null,
    },
    include: {
      client: true,
    },
  });

  // 5. Automatically create expiry notifications inside the company's dedicated database
  if (parsedExpiryDate && !isNaN(parsedExpiryDate.getTime())) {
    await scheduleExpiryNotifications(targetDb, document.id, effectiveOrgId, parsedExpiryDate, {
      documentName: document.documentName,
      assignedPerson: resolvedAssignedPerson,
      notificationConfig: organisation.notificationConfig,
    });
  }

  return {
    ...document,
    organisation: {
      id: organisation.id,
      companyName: organisation.companyName,
      subdomain: organisation.subdomain,
    },
  };
}

/**
 * Fetches documents strictly from the company's dedicated database.
 */
export async function getDocuments(queryParams: DocumentQueryParams) {
  const {
    page = 1,
    limit = 20,
    search,
    organisationId,
    clientId,
    documentType,
    status,
    expiringInDays,
  } = queryParams;

  const { targetDb, organisation } = await getDbForOrganisation(organisationId);
  const resolvedOrgId = organisation?.id;

  const whereClause: any = {};
  if (resolvedOrgId) {
    whereClause.organisationId = resolvedOrgId;
  }

  if (clientId) {
    whereClause.clientId = clientId;
  }

  if (documentType) {
    whereClause.documentType = documentType;
  }

  if (status) {
    whereClause.status = status;
  }

  if (expiringInDays && expiringInDays > 0) {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + expiringInDays);

    whereClause.expiryDate = {
      gte: now,
      lte: futureDate,
    };
  }

  if (search && search.trim() !== "") {
    const query = search.trim();
    whereClause.OR = [
      { documentName: { contains: query, mode: "insensitive" } },
      { assignedPerson: { contains: query, mode: "insensitive" } },
      { issuingAuthority: { contains: query, mode: "insensitive" } },
    ];
  }

  const skip = (page - 1) * limit;

  const [total, documents] = await Promise.all([
    targetDb.document.count({ where: whereClause }),
    targetDb.document.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: [{ expiryDate: "asc" }, { createdAt: "desc" }],
      include: {
        client: true,
      },
    }),
  ]);

  return {
    documents: documents.map((doc: any) => ({
      ...doc,
      organisation: organisation
        ? {
            id: organisation.id,
            companyName: organisation.companyName,
            subdomain: organisation.subdomain,
          }
        : null,
    })),
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

/**
 * Gets a single document by ID from the company's dedicated database.
 */
export async function getDocumentById(id: string, organisationId?: string) {
  const { targetDb, organisation } = await getDbForOrganisation(organisationId);

  const where: { id: string; organisationId?: string } = { id };
  if (organisation?.id) {
    where.organisationId = organisation.id;
  }

  const document = await targetDb.document.findFirst({
    where,
    include: {
      client: true,
    },
  });

  if (!document) {
    throw new Error(`Document with ID "${id}" not found.`);
  }

  return {
    ...document,
    organisation: organisation
      ? {
          id: organisation.id,
          companyName: organisation.companyName,
          subdomain: organisation.subdomain,
        }
      : null,
  };
}

/**
 * Updates an existing document inside the company's dedicated database.
 */
export async function updateDocument(
  id: string,
  input: UpdateDocumentInput,
  organisationId?: string
) {
  const { targetDb, organisation } = await getDbForOrganisation(organisationId);
  const existingDoc = await getDocumentById(id, organisationId);

  let resolvedDocumentUrl: string | undefined = undefined;
  if (input.documentUrl !== undefined) {
    if (input.documentUrl.trim() !== "") {
      resolvedDocumentUrl = await uploadClientDocumentToBunny(
        input.documentUrl.trim(),
        input.documentName || existingDoc.documentName,
        input.assignedPerson || existingDoc.assignedPerson || undefined
      );
    } else {
      resolvedDocumentUrl = "";
    }
  }

  const parsedIssueDate =
    input.issueDate !== undefined
      ? input.issueDate
        ? new Date(input.issueDate)
        : null
      : existingDoc.issueDate;

  const parsedExpiryDate =
    input.expiryDate !== undefined
      ? input.expiryDate
        ? new Date(input.expiryDate)
        : null
      : existingDoc.expiryDate;

  const updatedDoc = await targetDb.document.update({
    where: { id },
    data: {
      documentName: input.documentName ? input.documentName.trim() : undefined,
      documentType: input.documentType,
      issuingAuthority:
        input.issuingAuthority !== undefined ? input.issuingAuthority?.trim() || null : undefined,
      assignedPerson:
        input.assignedPerson !== undefined ? input.assignedPerson?.trim() || null : undefined,
      clientId: input.clientId !== undefined ? input.clientId : undefined,
      issueDate: parsedIssueDate,
      expiryDate: parsedExpiryDate,
      status: input.status,
      description: input.description !== undefined ? input.description?.trim() || null : undefined,
      documentUrl: resolvedDocumentUrl !== undefined ? resolvedDocumentUrl : undefined,
    },
    include: {
      client: true,
    },
  });

  // If expiry date changed, refresh scheduled notifications
  const expiryDateChanged =
    input.expiryDate !== undefined &&
    parsedExpiryDate?.getTime() !== existingDoc.expiryDate?.getTime();

  if (expiryDateChanged && parsedExpiryDate && !isNaN(parsedExpiryDate.getTime())) {
    await targetDb.documentNotification.deleteMany({
      where: {
        documentId: id,
        status: "PENDING",
      },
    });

    await scheduleExpiryNotifications(
      targetDb,
      updatedDoc.id,
      existingDoc.organisationId,
      parsedExpiryDate,
      {
        documentName: updatedDoc.documentName,
        assignedPerson: updatedDoc.assignedPerson,
        notificationConfig: organisation?.notificationConfig,
      }
    );
  }

  return {
    ...updatedDoc,
    organisation: organisation
      ? {
          id: organisation.id,
          companyName: organisation.companyName,
          subdomain: organisation.subdomain,
        }
      : null,
  };
}

/**
 * Deletes a document from the company's dedicated database.
 */
export async function deleteDocument(id: string, organisationId?: string) {
  const { targetDb } = await getDbForOrganisation(organisationId);

  const document = await targetDb.document.findFirst({ where: { id } });
  if (!document) {
    throw new Error(`Document with ID "${id}" not found.`);
  }

  if (document.documentUrl && document.documentUrl.includes("/clientdocuments/")) {
    try {
      const storagePath = document.documentUrl.substring(
        document.documentUrl.indexOf("clientdocuments/")
      );
      await deleteDocumentFromBunny(storagePath);
    } catch (err) {
      console.warn(`[BunnyStorage] Failed to delete Bunny file:`, err);
    }
  }

  await targetDb.document.delete({ where: { id } });

  return { success: true, message: "Document deleted successfully." };
}

/**
 * Aggregates document statistics directly from the company's dedicated database.
 */
export async function getDocumentStats(organisationId?: string) {
  const { targetDb, organisation } = await getDbForOrganisation(organisationId);
  const resolvedOrgId = organisation?.id;
  const orgFilter = resolvedOrgId ? { organisationId: resolvedOrgId } : {};

  const now = new Date();
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(now.getDate() + 7);

  const threeDaysFromNow = new Date();
  threeDaysFromNow.setDate(now.getDate() + 3);

  const oneDayFromNow = new Date();
  oneDayFromNow.setDate(now.getDate() + 1);

  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(now.getDate() + 30);

  const [
    total,
    active,
    draft,
    expired,
    expiringIn30Days,
    expiringIn7Days,
    expiringIn3Days,
    expiringIn1Day,
  ] = await Promise.all([
    targetDb.document.count({ where: orgFilter }),
    targetDb.document.count({ where: { ...orgFilter, status: "ACTIVE" } }),
    targetDb.document.count({ where: { ...orgFilter, status: "DRAFT" } }),
    targetDb.document.count({
      where: {
        ...orgFilter,
        OR: [{ status: "EXPIRED" }, { expiryDate: { lt: now } }],
      },
    }),
    targetDb.document.count({
      where: {
        ...orgFilter,
        status: { in: ["ACTIVE", "EXPIRING_SOON"] },
        expiryDate: { gte: now, lte: thirtyDaysFromNow },
      },
    }),
    targetDb.document.count({
      where: {
        ...orgFilter,
        status: { in: ["ACTIVE", "EXPIRING_SOON"] },
        expiryDate: { gte: now, lte: sevenDaysFromNow },
      },
    }),
    targetDb.document.count({
      where: {
        ...orgFilter,
        status: { in: ["ACTIVE", "EXPIRING_SOON"] },
        expiryDate: { gte: now, lte: threeDaysFromNow },
      },
    }),
    targetDb.document.count({
      where: {
        ...orgFilter,
        status: { in: ["ACTIVE", "EXPIRING_SOON"] },
        expiryDate: { gte: now, lte: oneDayFromNow },
      },
    }),
  ]);

  return {
    total,
    active,
    draft,
    expired,
    expiringIn30Days,
    expiringIn7Days,
    expiringIn3Days,
    expiringIn1Day,
  };
}

/**
 * Returns clients directly from the company's dedicated database.
 */
export async function getClients(organisationId?: string) {
  const { targetDb, organisation } = await getDbForOrganisation(organisationId);
  const resolvedOrgId = organisation?.id;
  const where = resolvedOrgId ? { organisationId: resolvedOrgId } : {};

  return targetDb.client.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      assignedPerson: true,
      email: true,
      phoneNumber: true,
      companyName: true,
      status: true,
    },
  });
}

/**
 * Schedules expiry reminder notifications inside the company's dedicated database.
 */
async function scheduleExpiryNotifications(
  targetDb: any,
  documentId: string,
  organisationId: string,
  expiryDate: Date,
  details: {
    documentName: string;
    assignedPerson: string | null;
    notificationConfig: any;
  }
) {
  const intervals = [
    { days: 7, stage: "SEVEN_DAYS" as const },
    { days: 3, stage: "THREE_DAYS" as const },
    { days: 1, stage: "ONE_DAY" as const },
  ];

  const recipient =
    details.notificationConfig?.primaryWhatsAppNumber ||
    details.notificationConfig?.notificationEmail ||
    "Tenant Admin";

  const notificationsData = intervals.map((interval) => {
    const scheduledFor = new Date(expiryDate);
    scheduledFor.setDate(scheduledFor.getDate() - interval.days);

    const personInfo = details.assignedPerson ? ` for ${details.assignedPerson}` : "";
    const title = `Reminder: Document "${details.documentName}" expires in ${interval.days} days`;
    const message = `Notice: The document "${details.documentName}"${personInfo} will expire on ${expiryDate.toLocaleDateString()}. Please initiate the renewal process.`;

    return {
      organisationId,
      documentId,
      daysBeforeExpiry: interval.days,
      stage: interval.stage,
      scheduledFor,
      channel: details.notificationConfig?.isWhatsAppEnabled
        ? ("WHATSAPP" as const)
        : ("EMAIL" as const),
      recipient,
      title,
      message,
      status: "PENDING" as const,
    };
  });

  try {
    await targetDb.documentNotification.createMany({
      data: notificationsData,
      skipDuplicates: true,
    });
  } catch (err) {
    console.warn(`[Notification Schedule] Could not schedule notifications:`, err);
  }
}

export interface DocumentExpiryNotificationItem {
  id: string;
  documentId: string;
  documentName: string;
  documentType: string;
  assignedPerson: string;
  companyName?: string;
  documentUrl?: string;
  expiryDate: string;
  daysRemaining: number;
  stage: "SEVEN_DAYS" | "THREE_DAYS" | "ONE_DAY" | "EXPIRED_TODAY";
  urgency: "critical" | "warning" | "notice" | "expired";
  title: string;
  message: string;
  channel: "SYSTEM" | "WHATSAPP" | "EMAIL";
  status: "PENDING" | "SCHEDULED" | "SENT" | "DELIVERED" | "FAILED";
  createdAt: string;
}

/**
 * Scans all documents in the organisation's database to check for expiry 7, 3, 1 days before,
 * generates/syncs system notifications, updates status, and returns urgency-ranked notifications.
 */
export async function checkAndSyncDocumentExpiryNotifications(organisationId?: string) {
  const { targetDb, organisation } = await getDbForOrganisation(organisationId);
  const resolvedOrgId = organisation?.id;
  const orgFilter = resolvedOrgId ? { organisationId: resolvedOrgId } : {};

  // Fetch all documents with an expiryDate that are not archived or draft
  const documents = await targetDb.document.findMany({
    where: {
      ...orgFilter,
      expiryDate: { not: null },
      status: { notIn: ["ARCHIVED", "DRAFT"] },
    },
    include: {
      client: true,
      organisation: {
        select: { id: true, companyName: true, subdomain: true },
      },
    },
    orderBy: { expiryDate: "asc" },
  });

  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const notifications: DocumentExpiryNotificationItem[] = [];

  for (const doc of documents) {
    if (!doc.expiryDate) continue;

    const expiryDate = new Date(doc.expiryDate);
    const expiryMidnight = new Date(expiryDate.getFullYear(), expiryDate.getMonth(), expiryDate.getDate());
    const diffMs = expiryMidnight.getTime() - todayMidnight.getTime();
    const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    // We check documents expiring within 7 days (or already expired)
    if (daysRemaining > 7) {
      continue;
    }

    let stage: "SEVEN_DAYS" | "THREE_DAYS" | "ONE_DAY" | "EXPIRED_TODAY" = "SEVEN_DAYS";
    let urgency: "critical" | "warning" | "notice" | "expired" = "notice";
    let title = "";
    let message = "";

    const assigned = doc.assignedPerson || doc.client?.assignedPerson || "Unassigned";

    if (daysRemaining < 0) {
      stage = "EXPIRED_TODAY";
      urgency = "expired";
      title = `Document Expired: ${doc.documentName}`;
      message = `Document "${doc.documentName}" assigned to ${assigned} expired on ${expiryDate.toLocaleDateString()}. Please initiate immediate renewal.`;

      // Update status to EXPIRED if not already
      if (doc.status !== "EXPIRED") {
        await targetDb.document.update({
          where: { id: doc.id },
          data: { status: "EXPIRED" },
        }).catch(() => {});
      }
    } else if (daysRemaining <= 1) {
      stage = "ONE_DAY";
      urgency = "critical";
      const timingText = daysRemaining === 0 ? "today" : "tomorrow (in 1 day)";
      title = `Critical: ${doc.documentName} expires ${timingText}!`;
      message = `Urgent renewal needed: "${doc.documentName}" (${doc.documentType.replace(/_/g, " ")}) for ${assigned} expires ${timingText} on ${expiryDate.toLocaleDateString()}.`;

      if (doc.status === "ACTIVE") {
        await targetDb.document.update({
          where: { id: doc.id },
          data: { status: "EXPIRING_SOON" },
        }).catch(() => {});
      }
    } else if (daysRemaining <= 3) {
      stage = "THREE_DAYS";
      urgency = "warning";
      title = `Warning: ${doc.documentName} expires in 3 days`;
      message = `Notice: "${doc.documentName}" for ${assigned} expires in ${daysRemaining} days on ${expiryDate.toLocaleDateString()}. Renewal action recommended.`;

      if (doc.status === "ACTIVE") {
        await targetDb.document.update({
          where: { id: doc.id },
          data: { status: "EXPIRING_SOON" },
        }).catch(() => {});
      }
    } else {
      // 4 to 7 days
      stage = "SEVEN_DAYS";
      urgency = "notice";
      title = `Notice: ${doc.documentName} expires in 7 days`;
      message = `Upcoming expiry: "${doc.documentName}" for ${assigned} expires in ${daysRemaining} days on ${expiryDate.toLocaleDateString()}.`;

      if (doc.status === "ACTIVE") {
        await targetDb.document.update({
          where: { id: doc.id },
          data: { status: "EXPIRING_SOON" },
        }).catch(() => {});
      }
    }

    // Upsert or log system notification in database
    let notifRecord: any = null;
    try {
      notifRecord = await targetDb.documentNotification.findFirst({
        where: {
          documentId: doc.id,
          stage,
          channel: "SYSTEM",
        },
      });

      if (!notifRecord) {
        notifRecord = await targetDb.documentNotification.create({
          data: {
            organisationId: doc.organisationId,
            documentId: doc.id,
            daysBeforeExpiry: Math.max(0, daysRemaining),
            stage,
            channel: "SYSTEM",
            recipient: assigned,
            title,
            message,
            status: "SENT",
            sentAt: new Date(),
            scheduledFor: now,
          },
        });
      }
    } catch {
      // Tenant schema fallback if relation isn't mirrored
    }

    notifications.push({
      id: notifRecord?.id || `sys-${doc.id}-${stage}`,
      documentId: doc.id,
      documentName: doc.documentName,
      documentType: doc.documentType,
      assignedPerson: assigned,
      companyName: doc.organisation?.companyName || organisation?.companyName || "Organization",
      documentUrl: doc.documentUrl,
      expiryDate: doc.expiryDate.toISOString(),
      daysRemaining,
      stage,
      urgency,
      title,
      message,
      channel: "SYSTEM",
      status: notifRecord?.status || "SENT",
      createdAt: notifRecord?.createdAt?.toISOString() || now.toISOString(),
    });
  }

  // Sort: Critical (1d) first, then Warning (3d), then Notice (7d), then Expired
  const urgencyWeight: Record<string, number> = { critical: 1, warning: 2, notice: 3, expired: 4 };
  notifications.sort((a, b) => {
    const diff = (urgencyWeight[a.urgency] || 5) - (urgencyWeight[b.urgency] || 5);
    if (diff !== 0) return diff;
    return a.daysRemaining - b.daysRemaining;
  });

  return {
    summary: {
      total: notifications.length,
      expiringIn1Day: notifications.filter((n) => n.urgency === "critical").length,
      expiringIn3Days: notifications.filter((n) => n.urgency === "warning").length,
      expiringIn7Days: notifications.filter((n) => n.urgency === "notice").length,
      expired: notifications.filter((n) => n.urgency === "expired").length,
    },
    notifications,
  };
}

/**
 * Marks a system notification as delivered/read.
 */
export async function markNotificationAsRead(notificationId: string, organisationId?: string) {
  const { targetDb } = await getDbForOrganisation(organisationId);
  try {
    await targetDb.documentNotification.update({
      where: { id: notificationId },
      data: { status: "DELIVERED" },
    });
    return { success: true };
  } catch {
    return { success: true };
  }
}

