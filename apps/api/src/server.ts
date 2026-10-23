import { buildApp } from "./app.js";
import { env } from "./config/index.js";
import { connectDatabase, disconnectDatabase } from "./database/index.js";
import { ensureDefaultAccounts } from "./modules/auth/auth.service.js";

async function main() {
  const app = buildApp();

  const shutdown = async (signal: string) => {
    console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
    try {
      await app.close();
      await disconnectDatabase();
      console.log("✅ Server and database connections successfully closed.");
      process.exit(0);
    } catch (err) {
      console.error("❌ Error occurred during graceful shutdown:", err);
      process.exit(1);
    }
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));

  try {
    const address = await app.listen({
      port: env.PORT,
      host: env.HOST,
    });

    const localUrl = `http://localhost:${env.PORT}`;
    const healthUrl = `${localUrl}/api/health`;

    console.log("\n========================================");
    console.log(`🚀 API Server running successfully!`);
    console.log(`   ➜ Local:    ${localUrl}`);
    console.log(`   ➜ Host:     ${address}`);
    console.log(`   ➜ Health:   ${healthUrl}`);
    console.log("========================================");

    // Verify and log Database connection
    await connectDatabase();
    await ensureDefaultAccounts();
    console.log("========================================\n");
  } catch (err) {
    console.error("❌ Failed to start API server:", err);
    process.exit(1);
  }
}

void main();
