import { prisma } from "../src/database/index.js";

async function clearAllData() {
  console.log("==================================================");
  console.log("            CLEARING ALL SAAS DATA               ");
  console.log("==================================================");

  // 1. Drop all tenant databases
  const tenantDbs: Array<{ datname: string }> = await prisma.$queryRaw`
    SELECT datname FROM pg_database WHERE datname LIKE 'tenant_%';
  `;

  console.log(`\n1. Found ${tenantDbs.length} company databases to drop...`);
  for (const db of tenantDbs) {
    console.log(`   ➜ Dropping database: "${db.datname}"...`);
    try {
      await prisma.$executeRawUnsafe(`
        SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity
        WHERE datname = '${db.datname}' AND pid <> pg_backend_pid();
      `);
      await prisma.$executeRawUnsafe(`DROP DATABASE "${db.datname}"`);
      console.log(`   ✓ Dropped "${db.datname}" successfully.`);
    } catch (err: any) {
      console.warn(`   ⚠️ Warning dropping "${db.datname}":`, err.message || err);
    }
  }

  // 2. Drop any lingering tenant schemas in task_saas_db
  const schemas: Array<{ schema_name: string }> = await prisma.$queryRaw`
    SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'tenant_%';
  `;
  if (schemas.length > 0) {
    console.log(`\n2. Dropping ${schemas.length} tenant schemas inside task_saas_db...`);
    for (const s of schemas) {
      try {
        await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${s.schema_name}" CASCADE;`);
        console.log(`   ✓ Dropped schema "${s.schema_name}".`);
      } catch (err: any) {
        console.warn(`   ⚠️ Warning dropping schema "${s.schema_name}":`, err.message || err);
      }
    }
  }

  // 3. Truncate all tables in public schema in task_saas_db
  console.log("\n3. Clearing all tables in master database (task_saas_db)...");
  const tables = [
    "document_notifications",
    "documents",
    "clients",
    "audit_logs",
    "notification_configs",
    "users",
    "organisations",
  ];

  for (const table of tables) {
    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "public"."${table}" CASCADE;`);
      console.log(`   ✓ Cleared table: "${table}"`);
    } catch (err: any) {
      // Table might not exist or already be empty
      console.log(`   - Table "${table}": ${err.message || "ok"}`);
    }
  }

  // 4. Verify clean state
  console.log("\n==================================================");
  console.log("                CURRENT STATE                     ");
  console.log("==================================================");

  const remainingDbs: Array<{ datname: string }> = await prisma.$queryRaw`
    SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname;
  `;
  console.log("Databases remaining on PostgreSQL:");
  console.table(remainingDbs);

  const [orgCount, userCount, docCount] = await Promise.all([
    prisma.organisation.count(),
    prisma.user.count(),
    prisma.document.count(),
  ]);

  console.log(`Master DB Records:`);
  console.log(` - Organisations: ${orgCount}`);
  console.log(` - Users:         ${userCount}`);
  console.log(` - Documents:     ${docCount}`);

  await prisma.$disconnect();
  console.log("\n🎉 All data has been completely cleared! Ready for fresh onboarding.");
}

clearAllData().catch((err) => {
  console.error("Error clearing data:", err);
  process.exit(1);
});
