import bcrypt from "bcryptjs";
import { prisma } from "../../database/index.js";
import {
  createTenantDatabase,
  dropTenantDatabase,
  initializeTenantDatabase,
  sanitizeDatabaseName,
  saveTenantData,
} from "../../database/tenant.js";
import { uploadMediaOrDocumentToBunny } from "../../services/bunny.service.js";
import type {
  CreateOrganisationInput,
  OrganisationQueryInput,
  UpdateOrganisationInput,
} from "./organization.schema.js";

/**
 * Registers a new organisation, provisions its dedicated PostgreSQL database,
 * initializes the database schema, saves company/admin/notification records
 * into both the dedicated tenant database and central platform registry.
 */
export async function createOrganisation(input: CreateOrganisationInput) {
  const { companyDetails, superAdminDetails } = input;
  const resolvedCompanyName = companyDetails.companyName || companyDetails.name;

  // 1. Check for duplicate organisation companyName or subdomain in platform database
  const existingOrg = await prisma.organisation.findFirst({
    where: {
      OR: [
        { companyName: { equals: resolvedCompanyName, mode: "insensitive" } },
        { subdomain: { equals: companyDetails.subdomain, mode: "insensitive" } },
      ],
    },
  });

  if (existingOrg) {
    throw new Error(
      `Organisation with Company Name "${resolvedCompanyName}" or subdomain "${companyDetails.subdomain}" already exists.`
    );
  }

  // 2. Check for duplicate Super Admin username or email in platform database
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { email: { equals: superAdminDetails.email, mode: "insensitive" } },
        { username: { equals: superAdminDetails.username, mode: "insensitive" } },
      ],
    },
  });

  if (existingUser) {
    throw new Error(
      `A user with email "${superAdminDetails.email}" or username "${superAdminDetails.username}" already exists.`
    );
  }

  // 3. Upload Logo and Document to Bunny Storage (storing resulting Bunny CDN URLs)
  let logoUrl: string | null = null;
  if (companyDetails.logo && companyDetails.logo.trim() !== "") {
    console.log(`[Bunny Upload] Uploading logo for "${resolvedCompanyName}" to Bunny Storage...`);
    logoUrl = await uploadMediaOrDocumentToBunny(
      companyDetails.logo,
      "logos",
      `${companyDetails.subdomain}_logo`
    );
    console.log(`[Bunny Upload] Logo successfully stored at Bunny CDN URL: "${logoUrl}"`);
  }

  let documentUrl: string | null = null;
  if (companyDetails.document && companyDetails.document.trim() !== "") {
    console.log(`[Bunny Upload] Uploading verification document for "${resolvedCompanyName}" to Bunny Storage...`);
    documentUrl = await uploadMediaOrDocumentToBunny(
      companyDetails.document,
      "verification-documents",
      `${companyDetails.subdomain}_verification_document`
    );
    console.log(`[Bunny Upload] Verification document successfully stored at Bunny CDN URL: "${documentUrl}"`);
  }

  // 4. Generate sanitized database name for the new organisation
  const databaseName = sanitizeDatabaseName(companyDetails.subdomain || resolvedCompanyName);

  // 5. Automatically provision the dedicated PostgreSQL tenant database
  console.log(`[Tenant Provisioning] Creating dedicated database: "${databaseName}"...`);
  const tenantDbUrl = await createTenantDatabase(databaseName);

  // 6. Initialize the schema & tables in the new tenant database
  console.log(`[Tenant Provisioning] Initializing tables in database: "${databaseName}"...`);
  const tenantPrisma = await initializeTenantDatabase(tenantDbUrl);

  try {
    // 7. Hash the Super Admin password
    const passwordHash = await bcrypt.hash(superAdminDetails.password, 10);

    const primaryWhatsApp = superAdminDetails.phoneNumber || "+971500000000";
    const notifEmail = superAdminDetails.email;
    const notifPasskey = "passkey_secure";

    // 8. Persist records in the central platform database (via transaction)
    const result = await prisma.$transaction(async (tx) => {
      const organisation = await tx.organisation.create({
        data: {
          companyName: resolvedCompanyName,
          databaseName,
          primaryLocation: companyDetails.primaryLocation,
          subdomain: companyDetails.subdomain.toLowerCase(),
          logo: logoUrl,
          document: documentUrl,
          status: "ACTIVE",
        },
      });

      const superAdmin = await tx.user.create({
        data: {
          organisationId: organisation.id,
          fullName: superAdminDetails.fullName || superAdminDetails.username,
          email: superAdminDetails.email,
          username: superAdminDetails.username,
          phoneNumber: superAdminDetails.phoneNumber,
          passwordHash,
          role: "SUPER_ADMIN",
          status: "ACTIVE",
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          username: true,
          phoneNumber: true,
          role: true,
          status: true,
          createdAt: true,
        },
      });

      const notificationConfig = await tx.notificationConfig.create({
        data: {
          organisationId: organisation.id,
          primaryWhatsAppNumber: primaryWhatsApp,
          isWhatsAppEnabled: true,
          notificationEmail: notifEmail,
          notificationPasskey: notifPasskey,
          isEmailEnabled: true,
        },
        select: {
          id: true,
          primaryWhatsAppNumber: true,
          whatsAppNumber2: true,
          whatsAppNumber3: true,
          whatsAppNumber4: true,
          isWhatsAppEnabled: true,
          notificationEmail: true,
          isEmailEnabled: true,
          createdAt: true,
        },
      });

      await tx.auditLog.create({
        data: {
          organisationId: organisation.id,
          userId: superAdmin.id,
          action: "ORGANISATION_AND_DATABASE_CREATED",
          entity: "Organisation",
          entityId: organisation.id,
          details: JSON.stringify({
            companyName: organisation.companyName,
            subdomain: organisation.subdomain,
            databaseName,
            superAdminUsername: superAdmin.username,
            logoUrl,
            documentUrl,
          }),
        },
      });

      return {
        organisation,
        superAdmin,
        notificationConfig,
      };
    });

    // 9. Save all details directly into the newly created tenant database
    console.log(`[Tenant Provisioning] Populating company records inside tenant database "${databaseName}"...`);
    await saveTenantData(tenantPrisma, {
      organisation: {
        id: result.organisation.id,
        companyName: result.organisation.companyName,
        databaseName,
        primaryLocation: result.organisation.primaryLocation,
        subdomain: result.organisation.subdomain,
        logo: result.organisation.logo,
        document: result.organisation.document,
        status: result.organisation.status,
      },
      superAdmin: {
        id: result.superAdmin.id,
        fullName: result.superAdmin.fullName || result.superAdmin.username,
        email: result.superAdmin.email,
        username: result.superAdmin.username,
        phoneNumber: result.superAdmin.phoneNumber,
        passwordHash,
        role: result.superAdmin.role,
        status: result.superAdmin.status,
      },
      notificationConfig: {
        id: result.notificationConfig.id,
        primaryWhatsAppNumber: result.notificationConfig.primaryWhatsAppNumber,
        whatsAppNumber2: result.notificationConfig.whatsAppNumber2,
        whatsAppNumber3: result.notificationConfig.whatsAppNumber3,
        whatsAppNumber4: result.notificationConfig.whatsAppNumber4,
        isWhatsAppEnabled: result.notificationConfig.isWhatsAppEnabled,
        notificationEmail: result.notificationConfig.notificationEmail,
        notificationPasskey: notifPasskey,
        isEmailEnabled: result.notificationConfig.isEmailEnabled,
      },
    });

    console.log(`[Tenant Provisioning] Successfully configured database "${databaseName}" for ${resolvedCompanyName}!`);

    return {
      ...result,
      database: {
        databaseName,
        provisioned: true,
      },
    };
  } finally {
    // Ensure the tenant connection is closed after initialization
    await tenantPrisma.$disconnect();
  }
}

/**
 * List organisations with pagination, search, and filtering
 */
export async function getOrganisations(query: OrganisationQueryInput) {
  const { page, limit, search, status } = query;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};

  if (status) {
    where.status = status;
  }

  if (search) {
    where.OR = [
      { companyName: { contains: search, mode: "insensitive" } },
      { subdomain: { contains: search, mode: "insensitive" } },
      { primaryLocation: { contains: search, mode: "insensitive" } },
      { databaseName: { contains: search, mode: "insensitive" } },
    ];
  }

  const [total, organisations] = await Promise.all([
    prisma.organisation.count({ where }),
    prisma.organisation.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        notificationConfig: {
          select: {
            primaryWhatsAppNumber: true,
            notificationEmail: true,
            isWhatsAppEnabled: true,
            isEmailEnabled: true,
          },
        },
        users: {
          where: { role: "SUPER_ADMIN" },
          select: {
            id: true,
            fullName: true,
            email: true,
            username: true,
            phoneNumber: true,
          },
          take: 1,
        },
        _count: {
          select: { users: true },
        },
      },
    }),
  ]);

  return {
    data: organisations.map((org) => ({
      ...org,
      superAdmin: org.users[0] ?? null,
      totalUsers: org._count.users,
    })),
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Retrieve organisation details by ID with notification settings and member users
 */
export async function getOrganisationById(id: string) {
  const organisation = await prisma.organisation.findUnique({
    where: { id },
    include: {
      notificationConfig: {
        select: {
          id: true,
          primaryWhatsAppNumber: true,
          whatsAppNumber2: true,
          whatsAppNumber3: true,
          whatsAppNumber4: true,
          isWhatsAppEnabled: true,
          notificationEmail: true,
          isEmailEnabled: true,
        },
      },
      users: {
        select: {
          id: true,
          fullName: true,
          email: true,
          username: true,
          phoneNumber: true,
          role: true,
          status: true,
          department: true,
          designation: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!organisation) {
    throw new Error(`Organisation with ID "${id}" not found.`);
  }

  return organisation;
}

/**
 * Get single organisation details by subdomain
 */
export async function getOrganisationBySubdomain(subdomain: string) {
  const cleanSubdomain = subdomain.trim().toLowerCase();
  const organisation = await prisma.organisation.findFirst({
    where: { subdomain: { equals: cleanSubdomain, mode: "insensitive" } },
    include: {
      notificationConfig: {
        select: {
          id: true,
          primaryWhatsAppNumber: true,
          whatsAppNumber2: true,
          whatsAppNumber3: true,
          whatsAppNumber4: true,
          isWhatsAppEnabled: true,
          notificationEmail: true,
          isEmailEnabled: true,
        },
      },
      users: {
        select: {
          id: true,
          fullName: true,
          email: true,
          username: true,
          phoneNumber: true,
          role: true,
          status: true,
          department: true,
          designation: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!organisation) {
    throw new Error(`Organisation with subdomain "${subdomain}" not found.`);
  }

  return organisation;
}

/**
 * Update organisation details
 */
export async function updateOrganisation(id: string, input: UpdateOrganisationInput) {
  const existing = await prisma.organisation.findUnique({
    where: { id },
    include: {
      users: { where: { role: "SUPER_ADMIN" }, take: 1 },
      notificationConfig: true,
    },
  });
  if (!existing) {
    throw new Error(`Organisation with ID "${id}" not found.`);
  }

  // 1. Resolve Company Details
  const companyName =
    input.companyName || input.name || input.companyDetails?.companyName || input.companyDetails?.name;
  const primaryLocation =
    input.primaryLocation || input.companyDetails?.primaryLocation;

  const logoInput =
    input.logo !== undefined ? input.logo : input.companyDetails?.logo;
  const documentInput =
    input.document !== undefined ? input.document : input.companyDetails?.document;

  const orgData: Record<string, unknown> = {};
  if (companyName) orgData.companyName = companyName;
  if (primaryLocation) orgData.primaryLocation = primaryLocation;

  if (logoInput !== undefined) {
    if (!logoInput || logoInput === "") {
      orgData.logo = null;
    } else {
      orgData.logo = await uploadMediaOrDocumentToBunny(
        logoInput,
        "logos",
        `${existing.subdomain || existing.companyName}_logo`
      );
    }
  }

  if (documentInput !== undefined) {
    if (!documentInput || documentInput === "") {
      orgData.document = null;
    } else {
      orgData.document = await uploadMediaOrDocumentToBunny(
        documentInput,
        "verification-documents",
        `${existing.subdomain || existing.companyName}_verification_document`
      );
    }
  }

  const updatedOrg = await prisma.organisation.update({
    where: { id },
    data: orgData,
  });

  // 2. Resolve Super Admin Credentials
  const email = input.email || input.superAdminDetails?.email;
  const phoneNumber =
    input.mobileNumber || input.phoneNumber || input.superAdminDetails?.phoneNumber;
  const username =
    input.superadminUsername || input.username || input.superAdminDetails?.username;
  const password = input.password || input.superAdminDetails?.password;

  const superAdmin = existing.users[0];
  if (superAdmin) {
    const userData: Record<string, unknown> = {};
    if (email && email.trim()) userData.email = email.trim();
    if (phoneNumber && phoneNumber.trim()) userData.phoneNumber = phoneNumber.trim();
    if (username && username.trim()) userData.username = username.trim();
    if (password && password.trim().length >= 8) {
      userData.passwordHash = await bcrypt.hash(password.trim(), 10);
    }

    if (Object.keys(userData).length > 0) {
      await prisma.user.update({
        where: { id: superAdmin.id },
        data: userData,
      });
    }
  }

  // 3. Resolve Notification Config
  if (existing.notificationConfig && (email || phoneNumber)) {
    const notifData: Record<string, unknown> = {};
    if (email && email.trim()) notifData.notificationEmail = email.trim();
    if (phoneNumber && phoneNumber.trim()) notifData.primaryWhatsAppNumber = phoneNumber.trim();
    if (Object.keys(notifData).length > 0) {
      await prisma.notificationConfig.update({
        where: { id: existing.notificationConfig.id },
        data: notifData,
      });
    }
  }

  return updatedOrg;
}

/**
 * Update organisation status (ACTIVE, INACTIVE, SUSPENDED)
 */
export async function updateOrganisationStatus(
  id: string,
  status: "PENDING" | "ACTIVE" | "INACTIVE" | "SUSPENDED"
) {
  const existing = await prisma.organisation.findUnique({ where: { id } });
  if (!existing) {
    throw new Error(`Organisation with ID "${id}" not found.`);
  }

  return await prisma.organisation.update({
    where: { id },
    data: { status },
  });
}

/**
 * Delete an organisation, cascade its dependencies, and drop its dedicated tenant database
 */
export async function deleteOrganisation(id: string) {
  const existing = await prisma.organisation.findUnique({ where: { id } });
  if (!existing) {
    throw new Error(`Organisation with ID "${id}" not found.`);
  }

  // Drop the dedicated tenant database if it exists
  if (existing.databaseName) {
    try {
      console.log(`[Tenant Cleanup] Dropping tenant database: "${existing.databaseName}"...`);
      await dropTenantDatabase(existing.databaseName);
    } catch (err) {
      console.warn(`[Tenant Cleanup] Warning: Could not drop database "${existing.databaseName}":`, err);
    }
  }

  await prisma.organisation.delete({ where: { id } });
  return {
    success: true,
    message: `Organisation "${existing.companyName}" and database "${existing.databaseName}" deleted successfully.`,
  };
}
