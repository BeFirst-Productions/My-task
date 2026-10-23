import bcrypt from "bcryptjs";
import { prisma } from "../../database/index.js";
import { signToken } from "./auth.utils.js";
import type { LoginInput } from "./auth.schema.js";
import { getPermittedModulesForRole } from "../user/user.constants.js";

export interface AuthUserResponse {
  id: string;
  fullName: string | null;
  email: string;
  username: string;
  phoneNumber: string;
  role: string;
  status: string;
  organisationId: string | null;
  organisation: {
    id: string;
    companyName: string;
    subdomain: string;
    logo: string | null;
    primaryLocation: string;
    status: string;
  } | null;
  permittedModules: string[];
  dashboardRedirect: string;
}

export interface LoginResult {
  token: string;
  user: AuthUserResponse;
}

/**
 * Authenticates user by username or email and password.
 * Accurately determines redirection path based on role and organization.
 */
export async function authenticateUser(input: LoginInput): Promise<LoginResult> {
  const identifier = input.identifier.trim();

  // Find user by either email or username
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: { equals: identifier, mode: "insensitive" } },
        { username: { equals: identifier, mode: "insensitive" } },
      ],
    },
    include: {
      organisation: true,
    },
  });

  if (!user) {
    throw new Error("Invalid username/email or password.");
  }

  // Check user account status
  if (user.status === "SUSPENDED") {
    throw new Error("Your account has been suspended by your administrator. You cannot log in until your account is reactivated.");
  }

  if (user.status === "INACTIVE") {
    throw new Error("Your account is currently inactive. Please contact your administrator.");
  }

  // Verify password hash
  const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);
  if (!isPasswordValid) {
    throw new Error("Invalid username/email or password.");
  }

  // If user belongs to an organisation, check organisation status
  if (user.organisationId && user.organisation) {
    if (user.organisation.status === "SUSPENDED") {
      throw new Error(`The organisation "${user.organisation.companyName}" is currently suspended.`);
    }
    if (user.organisation.status === "INACTIVE") {
      throw new Error(`The organisation "${user.organisation.companyName}" is currently inactive.`);
    }
  }

  // Update last login timestamp asynchronously
  prisma.user
    .update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })
    .catch((err) => console.error("[Auth] Failed to update lastLoginAt:", err));

  // Determine dashboard redirect URL
  let dashboardRedirect = "/login";
  if (user.role === "PLATFORM_OWNER") {
    dashboardRedirect = "/platform-owner";
  } else if (user.organisation?.subdomain) {
    // Tenant user redirected to their dynamic organization dashboard
    dashboardRedirect = `/org/${user.organisation.subdomain}/dashboard`;
  } else {
    dashboardRedirect = "/org/dashboard";
  }

  // Generate JWT token
  const token = signToken({
    userId: user.id,
    role: user.role,
    organisationId: user.organisationId,
    subdomain: user.organisation?.subdomain || null,
  });

  const formattedUser: AuthUserResponse = {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    username: user.username,
    phoneNumber: user.phoneNumber,
    role: user.role,
    status: user.status,
    organisationId: user.organisationId,
    organisation: user.organisation
      ? {
          id: user.organisation.id,
          companyName: user.organisation.companyName,
          subdomain: user.organisation.subdomain,
          logo: user.organisation.logo,
          primaryLocation: user.organisation.primaryLocation,
          status: user.organisation.status,
        }
      : null,
    permittedModules: getPermittedModulesForRole(user.role),
    dashboardRedirect,
  };

  return { token, user: formattedUser };
}

/**
 * Retrieves the current authenticated user's profile and organization
 */
export async function getMe(userId: string): Promise<AuthUserResponse> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { organisation: true },
  });

  if (!user) {
    throw new Error("User session not found.");
  }

  let dashboardRedirect = "/login";
  if (user.role === "PLATFORM_OWNER") {
    dashboardRedirect = "/platform-owner";
  } else if (user.organisation?.subdomain) {
    dashboardRedirect = `/org/${user.organisation.subdomain}/dashboard`;
  } else {
    dashboardRedirect = "/org/dashboard";
  }

  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    username: user.username,
    phoneNumber: user.phoneNumber,
    role: user.role,
    status: user.status,
    organisationId: user.organisationId,
    organisation: user.organisation
      ? {
          id: user.organisation.id,
          companyName: user.organisation.companyName,
          subdomain: user.organisation.subdomain,
          logo: user.organisation.logo,
          primaryLocation: user.organisation.primaryLocation,
          status: user.organisation.status,
        }
      : null,
    permittedModules: getPermittedModulesForRole(user.role),
    dashboardRedirect,
  };
}

/**
 * Ensures default platform owner and sample organisation exist so the system can be logged into immediately.
 */
export async function ensureDefaultAccounts(): Promise<void> {
  try {
    // 1. Seed Platform Owner if not existing
    const existingOwner = await prisma.user.findFirst({
      where: { role: "PLATFORM_OWNER" },
    });

    if (!existingOwner) {
      console.log("[Auth Seed] No Platform Owner found. Seeding default platform owner account...");
      const passwordHash = await bcrypt.hash("Admin@123456", 10);
      await prisma.user.create({
        data: {
          fullName: "Platform Owner",
          username: "platform_owner",
          email: "admin@mytask.com",
          phoneNumber: "+971500000000",
          passwordHash,
          role: "PLATFORM_OWNER",
          status: "ACTIVE",
        },
      });
      console.log("[Auth Seed] Platform Owner created: (username: platform_owner, pass: Admin@123456)");
    }

    // 2. Seed Default Organisation (IBH - International Business Hub) if none exists
    const existingIbhOrg = await prisma.organisation.findFirst({
      where: { subdomain: "ibh" },
    });

    if (!existingIbhOrg) {
      console.log("[Auth Seed] Seeding sample organisation: 'IBH - International Business Hub'...");
      const ibhPasswordHash = await bcrypt.hash("Admin@123456", 10);

      await prisma.$transaction(async (tx) => {
        const org = await tx.organisation.create({
          data: {
            companyName: "International Business Hub",
            databaseName: "tenant_ibh",
            primaryLocation: "Dubai, United Arab Emirates",
            subdomain: "ibh",
            logo: null,
            status: "ACTIVE",
          },
        });

        await tx.user.create({
          data: {
            organisationId: org.id,
            fullName: "IBH Super Admin",
            email: "superadmin@ibh.ae",
            username: "ibh_superadmin",
            phoneNumber: "+971501234567",
            passwordHash: ibhPasswordHash,
            role: "SUPER_ADMIN",
            status: "ACTIVE",
          },
        });

        await tx.notificationConfig.create({
          data: {
            organisationId: org.id,
            primaryWhatsAppNumber: "+971501234567",
            isWhatsAppEnabled: true,
            notificationEmail: "superadmin@ibh.ae",
            notificationPasskey: "passkey_ibh_2026",
            isEmailEnabled: true,
          },
        });
      });
      console.log("[Auth Seed] Sample 'IBH' Organisation & Super Admin seeded (username: ibh_superadmin, pass: Admin@123456)");
    }
  } catch (error) {
    console.error("[Auth Seed] Notice during seed initialization:", error instanceof Error ? error.message : error);
  }
}
