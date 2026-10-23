import { execSync } from "child_process";
import * as readline from "readline";
import { prisma } from "../src/database/index.js";
import { getTenantDatabaseUrl, sanitizeDatabaseName } from "../src/database/tenant.js";

async function main() {
  const arg = process.argv[2]?.trim();

  // 1. Fetch available databases from PostgreSQL
  const dbRows: Array<{ datname: string }> = await prisma.$queryRaw`
    SELECT datname FROM pg_database 
    WHERE datname LIKE 'tenant_%' OR datname = 'task_saas_db'
    ORDER BY datname;
  `;
  const availableDbs = dbRows.map((r) => r.datname);

  let selectedDb = "";

  if (arg) {
    // If user passed a name, e.g. "abc", "tenant_abc", or "task_saas_db"
    if (availableDbs.includes(arg)) {
      selectedDb = arg;
    } else if (availableDbs.includes(`tenant_${arg}`)) {
      selectedDb = `tenant_${arg}`;
    } else if (availableDbs.includes(sanitizeDatabaseName(arg))) {
      selectedDb = sanitizeDatabaseName(arg);
    } else {
      console.warn(`\n⚠️ Database "${arg}" not found in PostgreSQL. Using "${sanitizeDatabaseName(arg)}".`);
      selectedDb = sanitizeDatabaseName(arg);
    }
  } else {
    // 2. Interactive Selection if no argument was passed
    console.log("\n==================================================");
    console.log("       PRISMA STUDIO - MULTI-TENANT SELECTOR      ");
    console.log("==================================================");
    console.log("Available Databases:\n");

    availableDbs.forEach((dbName, index) => {
      const label = dbName === "task_saas_db" ? "(Master Platform DB)" : "(Company Database)";
      console.log(`  [${index + 1}] ${dbName} ${label}`);
    });

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const answer: string = await new Promise((resolve) => {
      rl.question("\nEnter choice (number or database name) [default: 1]: ", (ans) => {
        rl.close();
        resolve(ans.trim());
      });
    });

    const chosenIndex = parseInt(answer, 10);
    if (!isNaN(chosenIndex) && chosenIndex >= 1 && chosenIndex <= availableDbs.length) {
      selectedDb = availableDbs[chosenIndex - 1];
    } else if (answer && availableDbs.includes(answer)) {
      selectedDb = answer;
    } else if (answer && availableDbs.includes(`tenant_${answer}`)) {
      selectedDb = `tenant_${answer}`;
    } else {
      selectedDb = availableDbs[0] || "task_saas_db";
    }
  }

  await prisma.$disconnect();

  // 3. Derive Database URL and Port
  const targetUrl = getTenantDatabaseUrl(selectedDb);
  // Default to port 5556 for tenant databases, 5555 for master
  const port = selectedDb === "task_saas_db" ? "5555" : "5556";

  console.log(`\n--------------------------------------------------`);
  console.log(`🚀 Launching Prisma Studio for Database: ${selectedDb}`);
  console.log(`📡 URL: ${targetUrl}`);
  console.log(`🌐 Port: ${port}`);
  console.log(`--------------------------------------------------\n`);

  try {
    execSync(`npx prisma studio --port ${port}`, {
      stdio: "inherit",
      env: {
        ...process.env,
        DATABASE_URL: targetUrl,
      },
    });
  } catch {
    // Normal exit when user closes Prisma Studio (Ctrl+C)
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("Error launching Prisma Studio:", err);
  process.exit(1);
});
