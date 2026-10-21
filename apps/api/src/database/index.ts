import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __prismaClientInstance: PrismaClient | undefined;
}

export const prisma =
  globalThis.__prismaClientInstance ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["warn", "error"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__prismaClientInstance = prisma;
}

/**
 * Connects to and verifies PostgreSQL database connectivity.
 */
export async function connectDatabase(): Promise<boolean> {
  try {
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    console.log("   ➜ Database: Connected successfully (PostgreSQL)");
    return true;
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : String(error);
    console.error(`   ➜ Database: Connection failed (${errMessage})`);
    return false;
  }
}

/**
 * Checks connectivity to the PostgreSQL database.
 */
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Safely disconnects the Prisma client on shutdown.
 */
export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}
