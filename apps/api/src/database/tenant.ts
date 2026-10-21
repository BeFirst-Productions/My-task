import { PrismaClient } from "@prisma/client";
import { env } from "../config/index.js";
import { prisma } from "./index.js";

/**
 * Sanitizes a company name into a valid, safe PostgreSQL database name.
 * e.g. "Acme Global Trading LLC" -> "tenant_acme_global_trading_llc"
 */
export function sanitizeDatabaseName(companyName: string): string {
  const sanitized = companyName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 50);

  return `tenant_${sanitized || "company"}`;
}

/**
 * Derives the database connection URL for a specific tenant database
 * based on the master DATABASE_URL configuration.
 */
export function getTenantDatabaseUrl(databaseName: string): string {
  try {
    const url = new URL(env.DATABASE_URL);
    url.pathname = `/${databaseName}`;
    return url.toString();
  } catch {
    // Fallback regex replacement if URL constructor has parsing quirks with non-standard protocols
    return env.DATABASE_URL.replace(
      /\/([^/?]+)(\?.*)?$/,
      `/${databaseName}$2`
    );
  }
}

/**
 * Creates a dedicated PostgreSQL database for a company if it does not already exist.
 */
export async function createTenantDatabase(databaseName: string): Promise<string> {
  const checkQuery: Array<{ datname: string }> = await prisma.$queryRaw`
    SELECT datname FROM pg_database WHERE datname = ${databaseName}
  `;

  if (checkQuery.length === 0) {
    // Note: CREATE DATABASE cannot run in a parameterized prepared statement,
    // but databaseName has been strictly sanitized to alphanumeric and underscore.
    await prisma.$executeRawUnsafe(`CREATE DATABASE "${databaseName}"`);
  }

  return getTenantDatabaseUrl(databaseName);
}

/**
 * DDL SQL script to initialize the required tables inside the tenant database
 */
const TENANT_SCHEMA_DDL = `
CREATE TABLE IF NOT EXISTS organisations (
  id TEXT PRIMARY KEY,
  company_name TEXT NOT NULL,
  database_name TEXT UNIQUE,
  primary_location TEXT NOT NULL,
  subdomain TEXT UNIQUE NOT NULL,
  logo TEXT,
  document TEXT,
  status TEXT DEFAULT 'ACTIVE',
  created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  organisation_id TEXT REFERENCES organisations(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  phone_number TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'STAFF',
  status TEXT DEFAULT 'ACTIVE',
  department TEXT,
  designation TEXT,
  created_by_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  last_login_at TIMESTAMP(3),
  created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notification_configs (
  id TEXT PRIMARY KEY,
  organisation_id TEXT UNIQUE REFERENCES organisations(id) ON DELETE CASCADE,
  primary_whatsapp_number TEXT NOT NULL,
  whatsapp_number_2 TEXT,
  whatsapp_number_3 TEXT,
  whatsapp_number_4 TEXT,
  is_whatsapp_enabled BOOLEAN DEFAULT true,
  notification_email TEXT NOT NULL,
  notification_passkey TEXT NOT NULL,
  is_email_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  organisation_id TEXT REFERENCES organisations(id) ON DELETE SET NULL,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT,
  details TEXT,
  ip_address TEXT,
  created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_org ON users(organisation_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
`;

/**
 * Initializes the schema and tables in the newly created tenant database.
 */
export async function initializeTenantDatabase(tenantDbUrl: string): Promise<PrismaClient> {
  const tenantPrisma = new PrismaClient({
    datasources: {
      db: { url: tenantDbUrl },
    },
  });

  await tenantPrisma.$connect();

  // Execute schema creation
  const statements = TENANT_SCHEMA_DDL.split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const statement of statements) {
    await tenantPrisma.$executeRawUnsafe(statement);
  }

  return tenantPrisma;
}

/**
 * Saves company details, super admin user, notification config, and initial audit log
 * directly into the dedicated tenant database.
 */
export async function saveTenantData(
  tenantPrisma: PrismaClient,
  data: {
    organisation: {
      id: string;
      companyName: string;
      databaseName: string;
      primaryLocation: string;
      subdomain: string;
      logo: string | null;
      document: string | null;
      status: string;
    };
    superAdmin: {
      id: string;
      fullName: string;
      email: string;
      username: string;
      phoneNumber: string;
      passwordHash: string;
      role: string;
      status: string;
    };
    notificationConfig: {
      id: string;
      primaryWhatsAppNumber: string;
      whatsAppNumber2: string | null;
      whatsAppNumber3: string | null;
      whatsAppNumber4: string | null;
      isWhatsAppEnabled: boolean;
      notificationEmail: string;
      notificationPasskey: string;
      isEmailEnabled: boolean;
    };
  }
): Promise<void> {
  const { organisation, superAdmin, notificationConfig } = data;

  // Insert Organisation record inside tenant DB
  await tenantPrisma.$executeRawUnsafe(
    `INSERT INTO organisations (
      id, company_name, database_name, primary_location, subdomain, logo, document, status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT (id) DO NOTHING`,
    organisation.id,
    organisation.companyName,
    organisation.databaseName,
    organisation.primaryLocation,
    organisation.subdomain,
    organisation.logo,
    organisation.document,
    organisation.status
  );

  // Insert Super Admin User record inside tenant DB
  await tenantPrisma.$executeRawUnsafe(
    `INSERT INTO users (
      id, organisation_id, full_name, email, username, phone_number,
      password_hash, role, status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    ON CONFLICT (id) DO NOTHING`,
    superAdmin.id,
    organisation.id,
    superAdmin.fullName,
    superAdmin.email,
    superAdmin.username,
    superAdmin.phoneNumber,
    superAdmin.passwordHash,
    superAdmin.role,
    superAdmin.status
  );

  // Insert NotificationConfig record inside tenant DB
  await tenantPrisma.$executeRawUnsafe(
    `INSERT INTO notification_configs (
      id, organisation_id, primary_whatsapp_number, whatsapp_number_2,
      whatsapp_number_3, whatsapp_number_4, is_whatsapp_enabled,
      notification_email, notification_passkey, is_email_enabled
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    ON CONFLICT (id) DO NOTHING`,
    notificationConfig.id,
    organisation.id,
    notificationConfig.primaryWhatsAppNumber,
    notificationConfig.whatsAppNumber2,
    notificationConfig.whatsAppNumber3,
    notificationConfig.whatsAppNumber4,
    notificationConfig.isWhatsAppEnabled,
    notificationConfig.notificationEmail,
    notificationConfig.notificationPasskey,
    notificationConfig.isEmailEnabled
  );

  // Insert initial AuditLog record inside tenant DB
  await tenantPrisma.$executeRawUnsafe(
    `INSERT INTO audit_logs (
      id, organisation_id, user_id, action, entity, entity_id, details
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    crypto.randomUUID(),
    organisation.id,
    superAdmin.id,
    "TENANT_DATABASE_PROVISIONED",
    "Organisation",
    organisation.id,
    JSON.stringify({
      databaseName: organisation.databaseName,
      organisationName: organisation.companyName,
      superAdminUsername: superAdmin.username,
    })
  );
}

/**
 * Safely drops a tenant database when an organisation is deleted.
 */
export async function dropTenantDatabase(databaseName: string): Promise<void> {
  const checkQuery: Array<{ datname: string }> = await prisma.$queryRaw`
    SELECT datname FROM pg_database WHERE datname = ${databaseName}
  `;

  if (checkQuery.length > 0) {
    // Terminate existing connections to that database before dropping
    await prisma.$executeRawUnsafe(`
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = '${databaseName}' AND pid <> pg_backend_pid();
    `);

    await prisma.$executeRawUnsafe(`DROP DATABASE "${databaseName}"`);
  }
}
