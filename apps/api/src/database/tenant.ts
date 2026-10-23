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

// Backward-compatible alias
export const sanitizeSchemaName = sanitizeDatabaseName;

/**
 * Derives the database connection URL for a specific tenant database
 * based on the master DATABASE_URL configuration.
 */
export function getTenantDatabaseUrl(databaseName: string): string {
  try {
    const url = new URL(env.DATABASE_URL);
    url.pathname = `/${databaseName}`;
    url.searchParams.delete("schema");
    return url.toString();
  } catch {
    return env.DATABASE_URL.replace(/\/([^/?]+)(\?.*)?$/, `/${databaseName}`);
  }
}

// Backward-compatible alias
export const getTenantSchemaUrl = getTenantDatabaseUrl;

// Connection pool cache for active tenant databases
const tenantClientPool = new Map<string, PrismaClient>();

/**
 * Returns a connected PrismaClient instance for a specific tenant database.
 */
export async function getTenantPrisma(databaseName: string): Promise<PrismaClient> {
  const cached = tenantClientPool.get(databaseName);
  if (cached) {
    return cached;
  }

  const url = getTenantDatabaseUrl(databaseName);
  const client = new PrismaClient({
    datasources: {
      db: { url },
    },
  });

  await client.$connect();
  tenantClientPool.set(databaseName, client);
  return client;
}

/**
 * Creates a dedicated PostgreSQL database for a company if it does not already exist.
 */
export async function createTenantDatabase(databaseName: string): Promise<string> {
  const checkQuery: Array<{ datname: string }> = await prisma.$queryRaw`
    SELECT datname FROM pg_database WHERE datname = ${databaseName}
  `;

  if (checkQuery.length === 0) {
    await prisma.$executeRawUnsafe(`CREATE DATABASE "${databaseName}"`);
  }

  return getTenantDatabaseUrl(databaseName);
}

// Backward-compatible alias
export const createTenantSchema = createTenantDatabase;

/**
 * DDL SQL template to initialize all required tables inside the tenant database
 */
const TENANT_DATABASE_DDL = `
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

CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  organisation_id TEXT REFERENCES organisations(id) ON DELETE CASCADE,
  assigned_person TEXT NOT NULL,
  email TEXT,
  phone_number TEXT,
  company_name TEXT,
  status TEXT DEFAULT 'ACTIVE',
  created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  organisation_id TEXT REFERENCES organisations(id) ON DELETE CASCADE,
  client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
  assigned_person TEXT,
  document_type TEXT DEFAULT 'OTHER',
  document_name TEXT NOT NULL,
  issuing_authority TEXT,
  issue_date TIMESTAMP(3),
  expiry_date TIMESTAMP(3),
  status TEXT DEFAULT 'ACTIVE',
  description TEXT,
  document_url TEXT NOT NULL,
  uploaded_by_id TEXT,
  created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS document_notifications (
  id TEXT PRIMARY KEY,
  organisation_id TEXT REFERENCES organisations(id) ON DELETE CASCADE,
  document_id TEXT REFERENCES documents(id) ON DELETE CASCADE,
  days_before_expiry INT NOT NULL,
  stage TEXT NOT NULL,
  scheduled_for TIMESTAMP(3) NOT NULL,
  sent_at TIMESTAMP(3),
  channel TEXT NOT NULL,
  recipient TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'PENDING',
  failure_reason TEXT,
  retry_count INT DEFAULT 0,
  created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tenant_users_org ON users(organisation_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_tenant_docs_org ON documents(organisation_id);
CREATE INDEX IF NOT EXISTS idx_tenant_docs_expiry ON documents(expiry_date);
CREATE INDEX IF NOT EXISTS idx_tenant_notif_doc ON document_notifications(document_id);
CREATE INDEX IF NOT EXISTS idx_tenant_notif_sched ON document_notifications(scheduled_for, status);
`;

/**
 * Initializes the schema and tables in the newly created dedicated tenant database.
 */
export async function initializeTenantDatabase(tenantDbUrl: string): Promise<PrismaClient> {
  const tenantPrisma = new PrismaClient({
    datasources: {
      db: { url: tenantDbUrl },
    },
  });

  await tenantPrisma.$connect();

  const statements = TENANT_DATABASE_DDL
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const statement of statements) {
    await tenantPrisma.$executeRawUnsafe(statement);
  }

  return tenantPrisma;
}

// Backward-compatible alias
export async function initializeTenantSchema(
  schemaName: string,
  tenantDbUrl?: string
): Promise<PrismaClient> {
  const url = tenantDbUrl || getTenantDatabaseUrl(schemaName);
  return initializeTenantDatabase(url);
}

/**
 * Saves company details, super admin user, notification config, and initial audit log
 * directly into the dedicated tenant database.
 */
export async function saveTenantData(
  tenantPrisma: PrismaClient | undefined,
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
  const client = tenantPrisma || (await getTenantPrisma(organisation.databaseName));

  // Insert Organisation record inside tenant DB
  await client.$executeRawUnsafe(
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
  await client.$executeRawUnsafe(
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
  await client.$executeRawUnsafe(
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
  await client.$executeRawUnsafe(
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
 * Saves a client into the dedicated tenant database.
 */
export async function saveTenantClient(
  databaseName: string,
  client: {
    id: string;
    organisationId: string;
    assignedPerson: string;
    email?: string | null;
    phoneNumber?: string | null;
    companyName?: string | null;
    status?: string;
    createdAt?: Date;
    updatedAt?: Date;
  }
): Promise<void> {
  try {
    const tenantDb = await getTenantPrisma(databaseName);
    await tenantDb.$executeRawUnsafe(
      `INSERT INTO clients (
        id, organisation_id, assigned_person, email, phone_number, company_name, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (id) DO UPDATE SET
        assigned_person = EXCLUDED.assigned_person,
        email = EXCLUDED.email,
        phone_number = EXCLUDED.phone_number,
        company_name = EXCLUDED.company_name,
        status = EXCLUDED.status,
        updated_at = EXCLUDED.updated_at`,
      client.id,
      client.organisationId,
      client.assignedPerson,
      client.email ?? null,
      client.phoneNumber ?? null,
      client.companyName ?? null,
      client.status || "ACTIVE",
      client.createdAt || new Date(),
      client.updatedAt || new Date()
    );
  } catch (err) {
    console.error(`[Tenant Sync] Failed to save client in database "${databaseName}":`, err);
  }
}

/**
 * Saves or updates a document directly inside the dedicated tenant database.
 */
export async function saveTenantDocument(
  databaseName: string,
  document: {
    id: string;
    organisationId: string;
    clientId?: string | null;
    assignedPerson?: string | null;
    documentType: string;
    documentName: string;
    issuingAuthority?: string | null;
    issueDate?: Date | null;
    expiryDate?: Date | null;
    status: string;
    description?: string | null;
    documentUrl: string;
    uploadedById?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
  }
): Promise<void> {
  try {
    const tenantDb = await getTenantPrisma(databaseName);
    await tenantDb.$executeRawUnsafe(
      `INSERT INTO documents (
        id, organisation_id, client_id, assigned_person, document_type,
        document_name, issuing_authority, issue_date, expiry_date,
        status, description, document_url, uploaded_by_id, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      ON CONFLICT (id) DO UPDATE SET
        client_id = EXCLUDED.client_id,
        assigned_person = EXCLUDED.assigned_person,
        document_type = EXCLUDED.document_type,
        document_name = EXCLUDED.document_name,
        issuing_authority = EXCLUDED.issuing_authority,
        issue_date = EXCLUDED.issue_date,
        expiry_date = EXCLUDED.expiry_date,
        status = EXCLUDED.status,
        description = EXCLUDED.description,
        document_url = EXCLUDED.document_url,
        uploaded_by_id = EXCLUDED.uploaded_by_id,
        updated_at = EXCLUDED.updated_at`,
      document.id,
      document.organisationId,
      document.clientId ?? null,
      document.assignedPerson ?? null,
      document.documentType,
      document.documentName,
      document.issuingAuthority ?? null,
      document.issueDate ?? null,
      document.expiryDate ?? null,
      document.status,
      document.description ?? null,
      document.documentUrl,
      document.uploadedById ?? null,
      document.createdAt || new Date(),
      document.updatedAt || new Date()
    );
    console.log(`[Tenant Sync] Document "${document.documentName}" successfully saved in database "${databaseName}".`);
  } catch (err) {
    console.error(`[Tenant Sync] Failed to save document in database "${databaseName}":`, err);
  }
}

/**
 * Deletes a document directly inside the dedicated tenant database.
 */
export async function deleteTenantDocument(
  databaseName: string,
  documentId: string
): Promise<void> {
  try {
    const tenantDb = await getTenantPrisma(databaseName);
    await tenantDb.$executeRawUnsafe(
      `DELETE FROM documents WHERE id = $1`,
      documentId
    );
    console.log(`[Tenant Sync] Document "${documentId}" deleted from database "${databaseName}".`);
  } catch (err) {
    console.error(`[Tenant Sync] Failed to delete document from database "${databaseName}":`, err);
  }
}

/**
 * Safely drops a tenant database when an organisation is deleted.
 */
export async function dropTenantDatabase(databaseName: string): Promise<void> {
  // 1. Remove from client pool if open
  const cachedClient = tenantClientPool.get(databaseName);
  if (cachedClient) {
    await cachedClient.$disconnect().catch(() => {});
    tenantClientPool.delete(databaseName);
  }

  // 2. Terminate connections and drop the database
  try {
    const checkQuery: Array<{ datname: string }> = await prisma.$queryRaw`
      SELECT datname FROM pg_database WHERE datname = ${databaseName}
    `;

    if (checkQuery.length > 0) {
      await prisma.$executeRawUnsafe(`
        SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity
        WHERE datname = '${databaseName}' AND pid <> pg_backend_pid();
      `);
      await prisma.$executeRawUnsafe(`DROP DATABASE "${databaseName}"`);
      console.log(`[Tenant Cleanup] Dropped database "${databaseName}".`);
    }
  } catch (err) {
    console.warn(`[Tenant Cleanup] Could not drop database "${databaseName}":`, err);
  }
}

// Backward-compatible alias
export const dropTenantSchema = dropTenantDatabase;
