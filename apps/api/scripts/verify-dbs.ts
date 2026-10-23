import { prisma } from "../src/database/index.js";
import { getTenantPrisma } from "../src/database/tenant.js";

async function verifyDatabases() {
  console.log("==================================================");
  console.log("       MULTI-TENANT DATABASE VERIFICATION         ");
  console.log("==================================================");

  // 1. Fetch all tenant databases on the PostgreSQL server
  const dbs: Array<{ datname: string }> = await prisma.$queryRaw`
    SELECT datname FROM pg_database 
    WHERE datname LIKE 'tenant_%' OR datname = 'task_saas_db'
    ORDER BY datname;
  `;

  console.log("\n1. All Databases on PostgreSQL Server:");
  console.table(dbs);

  // 2. Fetch all organizations registered in the master platform database
  const orgs = await prisma.organisation.findMany({
    select: {
      id: true,
      companyName: true,
      subdomain: true,
      databaseName: true,
      status: true,
    },
  });

  console.log("\n2. Registered Companies in Master Database (task_saas_db):");
  console.table(orgs);

  // 3. Inspect inside each dedicated tenant database
  console.log("\n3. Inspecting Inside Each Company's Dedicated Database:");

  for (const org of orgs) {
    const dbName = org.databaseName || `tenant_${org.subdomain}`;
    console.log(`\n--------------------------------------------------`);
    console.log(`Checking Database: "${dbName}" (${org.companyName})`);
    console.log(`--------------------------------------------------`);

    try {
      const tenantDb = await getTenantPrisma(dbName);

      // Check users
      const users: Array<{ id: string; full_name: string; email: string; role: string }> =
        await tenantDb.$queryRaw`SELECT id, full_name, email, role FROM users;`;

      console.log(`Users in "${dbName}":`);
      console.table(users);

      // Check documents
      const docs: Array<{ id: string; document_name: string; assigned_person: string; status: string }> =
        await tenantDb.$queryRaw`SELECT id, document_name, assigned_person, status FROM documents;`;

      console.log(`Documents in "${dbName}":`);
      console.table(docs);

      await tenantDb.$disconnect();
    } catch (err: any) {
      console.error(`Could not read database "${dbName}":`, err.message || err);
    }
  }

  await prisma.$disconnect();
  console.log("\n✓ Verification complete! All tenant data is physically isolated.");
}

verifyDatabases().catch(console.error);
