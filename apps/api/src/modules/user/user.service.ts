import bcrypt from "bcryptjs";
import { PrismaClient, type Role, type UserStatus } from "@prisma/client";
import { prisma } from "../../database/index.js";
import { getTenantDatabaseUrl } from "../../database/tenant.js";
import type {
  CreateTenantUserInput,
  UpdateTenantUserInput,
  CreatePlatformUserInput,
  UserQueryInput,
} from "./user.schema.js";

export interface SanitizedUser {
  id: string;
  organisationId: string | null;
  fullName: string | null;
  email: string;
  username: string;
  phoneNumber: string;
  role: string;
  status: string;
  department: string | null;
  designation: string | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  organisation?: {
    id: string;
    companyName: string;
    subdomain: string;
    status: string;
  } | null;
  createdBy?: {
    id: string;
    fullName: string | null;
    username: string;
  } | null;
}

const SAFE_USER_SELECT = {
  id: true,
  organisationId: true,
  fullName: true,
  email: true,
  username: true,
  phoneNumber: true,
  role: true,
  status: true,
  department: true,
  designation: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
  organisation: {
    select: {
      id: true,
      companyName: true,
      subdomain: true,
      status: true,
    },
  },
  createdBy: {
    select: {
      id: true,
      fullName: true,
      username: true,
    },
  },
} as const;

/**
 * Creates an internal team member (Admin or Staff) for a specific organization.
 * Strictly scoped to the organization; tenant admins cannot assign higher roles.
 */
export async function createTenantUser(
  organisationId: string,
  createdById: string,
  input: CreateTenantUserInput
): Promise<SanitizedUser> {
  // 1. Verify organization exists and is active
  const organisation = await prisma.organisation.findUnique({
    where: { id: organisationId },
  });

  if (!organisation) {
    throw new Error("Organization not found.");
  }

  if (organisation.status === "SUSPENDED" || organisation.status === "INACTIVE") {
    throw new Error(`Cannot add users: Organization is currently ${organisation.status.toLowerCase()}.`);
  }

  // 2. Resolve username & check uniqueness
  const rawUsername = input.username?.trim() || input.email.split("@")[0].replace(/[^a-zA-Z0-9_.-]/g, "");
  const resolvedUsername = (rawUsername || "user_" + Math.random().toString(36).substring(2, 7)).toLowerCase();

  const existingEmail = await prisma.user.findFirst({
    where: { email: { equals: input.email.trim(), mode: "insensitive" } },
  });
  if (existingEmail) {
    throw new Error(`A user with email "${input.email}" already exists.`);
  }

  const existingUsername = await prisma.user.findFirst({
    where: { username: { equals: resolvedUsername, mode: "insensitive" } },
  });
  if (existingUsername) {
    throw new Error(`Username "${resolvedUsername}" is already taken.`);
  }

  // 3. Hash password
  const passwordHash = await bcrypt.hash(input.password, 10);

  // 4. Create user in central database
  const createdUser = await prisma.user.create({
    data: {
      organisationId,
      fullName: input.fullName.trim(),
      email: input.email.trim().toLowerCase(),
      username: resolvedUsername,
      phoneNumber: input.phoneNumber.trim(),
      passwordHash,
      role: input.role as Role,
      status: (input.status as UserStatus) || "ACTIVE",
      department: input.department?.trim() || null,
      designation: input.designation?.trim() || null,
      createdById,
    },
    select: SAFE_USER_SELECT,
  });

  // 5. Asynchronously synchronize user to tenant dedicated database if provisioned
  if (organisation.databaseName) {
    syncUserToTenantDatabase(organisation.databaseName, {
      ...createdUser,
      passwordHash,
    }).catch((err) => {
      console.warn(`[Tenant Sync] Non-blocking warning: Failed to sync user to tenant DB:`, err);
    });
  }

  return createdUser;
}

/**
 * Retrieves paginated list of users strictly belonging to the given organization.
 */
export async function getTenantUsers(
  organisationId: string,
  query: UserQueryInput
) {
  const page = Math.max(1, query.page || 1);
  const limit = Math.min(100, Math.max(1, query.limit || 10));
  const skip = (page - 1) * limit;

  // Build filter conditions
  const where: any = {
    organisationId,
  };

  if (query.role) {
    where.role = query.role;
  }

  if (query.status) {
    where.status = query.status;
  }

  if (query.department) {
    where.department = { contains: query.department, mode: "insensitive" };
  }

  if (query.search && query.search.trim()) {
    const s = query.search.trim();
    where.OR = [
      { fullName: { contains: s, mode: "insensitive" } },
      { email: { contains: s, mode: "insensitive" } },
      { username: { contains: s, mode: "insensitive" } },
      { phoneNumber: { contains: s, mode: "insensitive" } },
      { designation: { contains: s, mode: "insensitive" } },
      { department: { contains: s, mode: "insensitive" } },
    ];
  }

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      select: SAFE_USER_SELECT,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
  ]);

  return {
    users,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    },
  };
}

/**
 * Retrieves a single user strictly within the organization.
 */
export async function getTenantUserById(organisationId: string, userId: string): Promise<SanitizedUser> {
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      organisationId,
    },
    select: SAFE_USER_SELECT,
  });

  if (!user) {
    throw new Error("User not found within this organization.");
  }

  return user;
}

/**
 * Updates a user within the organization.
 */
export async function updateTenantUser(
  organisationId: string,
  userId: string,
  input: UpdateTenantUserInput
): Promise<SanitizedUser> {
  // Verify user exists inside this organization
  const existingUser = await prisma.user.findFirst({
    where: { id: userId, organisationId },
  });

  if (!existingUser) {
    throw new Error("User not found within this organization.");
  }

  const updateData: any = {};

  if (input.fullName !== undefined) updateData.fullName = input.fullName.trim();
  if (input.phoneNumber !== undefined) updateData.phoneNumber = input.phoneNumber.trim();
  if (input.department !== undefined) updateData.department = input.department?.trim() || null;
  if (input.designation !== undefined) updateData.designation = input.designation?.trim() || null;
  if (input.status !== undefined) updateData.status = input.status;
  if (input.role !== undefined) updateData.role = input.role;

  if (input.password && input.password.trim().length >= 8) {
    updateData.passwordHash = await bcrypt.hash(input.password, 10);
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: SAFE_USER_SELECT,
  });

  return updatedUser;
}

/**
 * Deletes a user within the organization.
 * Prevents deleting the organization's primary SUPER_ADMIN or self.
 */
export async function deleteTenantUser(
  organisationId: string,
  userId: string,
  actorId: string
): Promise<{ success: boolean; message: string }> {
  if (userId === actorId) {
    throw new Error("You cannot delete your own account.");
  }

  const user = await prisma.user.findFirst({
    where: { id: userId, organisationId },
  });

  if (!user) {
    throw new Error("User not found within this organization.");
  }

  if (user.role === "SUPER_ADMIN") {
    throw new Error("The organization's primary Super Admin cannot be deleted. Contact Platform Support.");
  }

  await prisma.user.delete({
    where: { id: userId },
  });

  return {
    success: true,
    message: `User "${user.fullName || user.username}" was successfully removed.`,
  };
}

/**
 * Platform Owner: List all users across all organisations with global filters.
 */
export async function getPlatformUsers(query: UserQueryInput & { organisationId?: string }) {
  const page = Math.max(1, query.page || 1);
  const limit = Math.min(100, Math.max(1, query.limit || 15));
  const skip = (page - 1) * limit;

  const where: any = {};

  if (query.organisationId) {
    where.organisationId = query.organisationId;
  }

  if (query.role) {
    where.role = query.role;
  }

  if (query.status) {
    where.status = query.status;
  }

  if (query.search && query.search.trim()) {
    const s = query.search.trim();
    where.OR = [
      { fullName: { contains: s, mode: "insensitive" } },
      { email: { contains: s, mode: "insensitive" } },
      { username: { contains: s, mode: "insensitive" } },
      { phoneNumber: { contains: s, mode: "insensitive" } },
      { organisation: { companyName: { contains: s, mode: "insensitive" } } },
    ];
  }

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      select: SAFE_USER_SELECT,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
  ]);

  return {
    users,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    },
  };
}

/**
 * Platform Owner: Update any user's status globally (e.g. SUSPENDED, ACTIVE).
 */
export async function updatePlatformUserStatus(userId: string, status: UserStatus) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error("User not found.");
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { status },
    select: SAFE_USER_SELECT,
  });

  return updated;
}

/**
 * Helper to sync user into tenant dedicated database table
 */
async function syncUserToTenantDatabase(
  databaseName: string,
  user: any
): Promise<void> {
  const tenantUrl = getTenantDatabaseUrl(databaseName);
  const tenantPrisma = new PrismaClient({
    datasources: { db: { url: tenantUrl } },
  });

  try {
    await tenantPrisma.$connect();
    await tenantPrisma.$executeRawUnsafe(
      `INSERT INTO users (
        id, organisation_id, full_name, email, username, phone_number,
        password_hash, role, status, department, designation
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        phone_number = EXCLUDED.phone_number,
        role = EXCLUDED.role,
        status = EXCLUDED.status,
        department = EXCLUDED.department,
        designation = EXCLUDED.designation,
        updated_at = CURRENT_TIMESTAMP`,
      user.id,
      user.organisationId,
      user.fullName,
      user.email,
      user.username,
      user.phoneNumber,
      user.passwordHash,
      user.role,
      user.status,
      user.department,
      user.designation
    );
  } finally {
    await tenantPrisma.$disconnect();
  }
}
