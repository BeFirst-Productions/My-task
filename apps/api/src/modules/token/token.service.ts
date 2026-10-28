import { prisma } from "../../database/index.js";
import type { CreateTokenInput, UpdateTokenStatusInput } from "./token.schema.js";

/**
 * Resolves an organisation by ID or subdomain.
 */
export async function resolveOrganisation(idOrSubdomain: string) {
  return prisma.organisation.findFirst({
    where: {
      OR: [
        { id: idOrSubdomain },
        { subdomain: { equals: idOrSubdomain, mode: "insensitive" } },
      ],
    },
    include: {
      setting: true,
    },
  });
}

/**
 * Generates the next sequential human-readable token number, e.g. TK-1001.
 */
async function generateTokenNumber(): Promise<string> {
  const count = await prisma.supportToken.count();
  return `TK-${1001 + count}`;
}

/**
 * Creates a new support token for an organisation.
 */
export async function createSupportToken(
  idOrSubdomain: string,
  input: CreateTokenInput,
  user?: { id?: string; fullName?: string; role?: any }
) {
  const org = await resolveOrganisation(idOrSubdomain);
  if (!org) {
    throw new Error(`Organisation "${idOrSubdomain}" not found.`);
  }

  const tokenNumber = await generateTokenNumber();

  // Create Support Token with initial message
  const token = await prisma.supportToken.create({
    data: {
      tokenNumber,
      organisationId: org.id,
      createdById: user?.id || null,
      category: input.category,
      customCategory: input.customCategory || null,
      priority: input.priority,
      status: "OPEN",
      subject: input.subject,
      description: input.description,
      currentDomain: input.currentDomain || (org.setting?.websiteUrl ? org.setting.websiteUrl : `${org.subdomain}.mytask.com`),
      requestedDomain: input.requestedDomain || null,
      messages: {
        create: {
          senderId: user?.id || null,
          senderName: user?.fullName || "Super Admin",
          senderRole: (user?.role as any) || "SUPER_ADMIN",
          message: input.description,
        },
      },
    },
    include: {
      organisation: true,
      createdBy: true,
      messages: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  // Notify Platform Owner
  await prisma.systemNotification.create({
    data: {
      recipientRole: "PLATFORM_OWNER",
      organisationId: org.id,
      type: input.category === "DOMAIN_CHANGE" ? "DOMAIN" : "TOKEN",
      referenceId: token.id,
      title: `New Token #${token.tokenNumber} from ${org.companyName}`,
      message: `${user?.fullName || "Super Admin"} raised a ${
        input.category === "DOMAIN_CHANGE" ? "Domain Name Change Request" : "Support Token"
      }: "${input.subject}"`,
      isRead: false,
    },
  });

  return token;
}

/**
 * Retrieves all tokens for a specific organisation.
 */
export async function getTokensForOrganisation(
  idOrSubdomain: string,
  filter?: { status?: string; category?: string }
) {
  const org = await resolveOrganisation(idOrSubdomain);
  if (!org) {
    throw new Error(`Organisation "${idOrSubdomain}" not found.`);
  }

  const where: any = { organisationId: org.id };
  if (filter?.status && filter.status !== "ALL") {
    where.status = filter.status;
  }
  if (filter?.category && filter.category !== "ALL") {
    where.category = filter.category;
  }

  return prisma.supportToken.findMany({
    where,
    include: {
      createdBy: true,
      messages: {
        orderBy: { createdAt: "asc" },
      },
      organisation: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Retrieves all tokens across all organisations for Platform Owner.
 */
export async function getAllTokensForPlatform(filter?: {
  status?: string;
  category?: string;
  organisationId?: string;
}) {
  const where: any = {};
  if (filter?.status && filter.status !== "ALL") {
    where.status = filter.status;
  }
  if (filter?.category && filter.category !== "ALL") {
    where.category = filter.category;
  }
  if (filter?.organisationId) {
    where.organisationId = filter.organisationId;
  }

  return prisma.supportToken.findMany({
    where,
    include: {
      organisation: {
        include: { setting: true },
      },
      createdBy: true,
      messages: {
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Retrieves a single token with full thread.
 */
export async function getTokenById(tokenId: string) {
  const token = await prisma.supportToken.findUnique({
    where: { id: tokenId },
    include: {
      organisation: {
        include: { setting: true },
      },
      createdBy: true,
      messages: {
        include: { sender: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!token) {
    throw new Error(`Token with ID "${tokenId}" not found.`);
  }

  return token;
}

/**
 * Updates status of a token (e.g. APPROVED, IN_REVIEW, REJECTED, RESOLVED).
 * If category is DOMAIN_CHANGE and status is APPROVED, unlocks domain editing in organization settings.
 */
export async function updateTokenStatus(
  tokenId: string,
  input: UpdateTokenStatusInput,
  user?: { id?: string; fullName?: string; role?: any }
) {
  const token = await getTokenById(tokenId);

  // If approved and domain change, unlock domain edit in settings
  const shouldUnlockDomain =
    (input.status === "APPROVED" || input.approveDomainChange === true) &&
    token.category === "DOMAIN_CHANGE";

  if (shouldUnlockDomain && token.organisationId) {
    await prisma.setting.updateMany({
      where: { organisationId: token.organisationId },
      data: { domainEditUnlocked: true },
    });
  }

  // Update token
  await prisma.supportToken.update({
    where: { id: tokenId },
    data: {
      status: input.status,
      resolutionNotes: input.resolutionNotes !== undefined ? input.resolutionNotes : token.resolutionNotes,
    },
    include: {
      organisation: {
        include: { setting: true },
      },
      createdBy: true,
      messages: {
        include: { sender: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  // Add system log message in the conversation thread
  await prisma.tokenMessage.create({
    data: {
      tokenId,
      senderId: user?.id || null,
      senderName: user?.fullName || "Platform Owner",
      senderRole: (user?.role as any) || "PLATFORM_OWNER",
      message: `Token status was updated to "${input.status}"${
        shouldUnlockDomain ? " • Domain edit permission UNLOCKED for Organisation SuperAdmin." : ""
      }${input.resolutionNotes ? `\nNote: ${input.resolutionNotes}` : ""}`,
    },
  });

  // Notify Organisation Super Admin
  await prisma.systemNotification.create({
    data: {
      recipientRole: "SUPER_ADMIN",
      organisationId: token.organisationId,
      type: token.category === "DOMAIN_CHANGE" ? "DOMAIN" : "TOKEN",
      referenceId: token.id,
      title: `Token #${token.tokenNumber} ${input.status}`,
      message: shouldUnlockDomain
        ? `Platform Owner has APPROVED your Domain Change Request! You can now edit your domain under Settings > Organisation Information.`
        : `Platform Owner has updated your token status to "${input.status}".${input.resolutionNotes ? ` Note: ${input.resolutionNotes}` : ""}`,
      isRead: false,
    },
  });

  return getTokenById(tokenId);
}

/**
 * Appends a message to the token thread.
 */
export async function addMessageToToken(
  tokenId: string,
  message: string,
  user?: { id?: string; fullName?: string; role?: any }
) {
  const token = await getTokenById(tokenId);

  const senderRole = user?.role || "SUPER_ADMIN";
  const senderName = user?.fullName || (senderRole === "PLATFORM_OWNER" ? "Platform Owner" : "Super Admin");

  const newMessage = await prisma.tokenMessage.create({
    data: {
      tokenId,
      senderId: user?.id || null,
      senderName,
      senderRole,
      message,
    },
    include: {
      sender: true,
    },
  });

  // Touch token updated_at
  await prisma.supportToken.update({
    where: { id: tokenId },
    data: { updatedAt: new Date() },
  });

  // Send bidirectional notification
  if (senderRole === "PLATFORM_OWNER") {
    // Notify Organisation SuperAdmin
    await prisma.systemNotification.create({
      data: {
        recipientRole: "SUPER_ADMIN",
        organisationId: token.organisationId,
        type: "TOKEN",
        referenceId: token.id,
        title: `Reply on Token #${token.tokenNumber}`,
        message: `Platform Owner replied: "${message.slice(0, 80)}${message.length > 80 ? "..." : ""}"`,
        isRead: false,
      },
    });
  } else {
    // Notify Platform Owner
    await prisma.systemNotification.create({
      data: {
        recipientRole: "PLATFORM_OWNER",
        organisationId: token.organisationId,
        type: "TOKEN",
        referenceId: token.id,
        title: `New message on Token #${token.tokenNumber}`,
        message: `${senderName} (${token.organisation.companyName}): "${message.slice(0, 80)}${message.length > 80 ? "..." : ""}"`,
        isRead: false,
      },
    });
  }

  return newMessage;
}

/**
 * Returns current domain edit authorization status and active domain change request for an organisation.
 */
export async function getDomainEditStatus(idOrSubdomain: string) {
  const org = await resolveOrganisation(idOrSubdomain);
  if (!org) {
    throw new Error(`Organisation "${idOrSubdomain}" not found.`);
  }

  const setting = await prisma.setting.findUnique({
    where: { organisationId: org.id },
  });

  // Find most recent domain request token
  const latestDomainToken = await prisma.supportToken.findFirst({
    where: {
      organisationId: org.id,
      category: "DOMAIN_CHANGE",
    },
    orderBy: { createdAt: "desc" },
  });

  const canEditDomain = Boolean(setting?.domainEditUnlocked);
  const isPending = latestDomainToken?.status === "OPEN" || latestDomainToken?.status === "IN_REVIEW";
  const isApproved = latestDomainToken?.status === "APPROVED";

  return {
    canEditDomain,
    settingUnlocked: canEditDomain,
    currentWebsiteUrl: setting?.websiteUrl || `https://${org.subdomain}.mytask.com`,
    latestDomainToken,
    isPending,
    isApproved,
  };
}
