import { prisma } from "../src/database/index.js";
import bcrypt from "bcryptjs";

/**
 * Custom Database Update Script
 * ---------------------------------------------------------------------
 * Use this script to safely update, seed, or fix records in your database.
 * Run with:
 *   cd apps/api
 *   npx tsx scripts/update-db.ts
 * ---------------------------------------------------------------------
 */
async function main() {
  console.log("🔄 Starting database update process...");

  // 1. Ensure / Update Platform Owner
  const ownerPassword = "Admin@123456";
  const ownerPasswordHash = await bcrypt.hash(ownerPassword, 10);

  const existingOwner = await prisma.user.findFirst({
    where: { role: "PLATFORM_OWNER" },
  });

  if (existingOwner) {
    await prisma.user.update({
      where: { id: existingOwner.id },
      data: {
        fullName: "Platform Owner",
        username: "platform_owner",
        email: "admin@mytask.com",
        passwordHash: ownerPasswordHash,
        status: "ACTIVE",
      },
    });
    console.log(`✅ Platform Owner account updated (username: platform_owner, pass: ${ownerPassword})`);
  } else {
    await prisma.user.create({
      data: {
        fullName: "Platform Owner",
        username: "platform_owner",
        email: "admin@mytask.com",
        phoneNumber: "+971500000000",
        passwordHash: ownerPasswordHash,
        role: "PLATFORM_OWNER",
        status: "ACTIVE",
      },
    });
    console.log(`✅ Platform Owner account created (username: platform_owner, pass: ${ownerPassword})`);
  }

  // 2. Ensure / Update Default Organisation (IBH)
  const existingIbh = await prisma.organisation.findFirst({
    where: { subdomain: "ibh" },
  });

  if (existingIbh) {
    await prisma.organisation.update({
      where: { id: existingIbh.id },
      data: {
        companyName: "International Business Hub",
        status: "ACTIVE",
      },
    });
    console.log("✅ IBH Organisation verified and updated.");

    // Update IBH Super Admin password / details
    const superAdminPassword = "Admin@123456";
    const superAdminHash = await bcrypt.hash(superAdminPassword, 10);

    const ibhSuperAdmin = await prisma.user.findFirst({
      where: {
        organisationId: existingIbh.id,
        role: "SUPER_ADMIN",
      },
    });

    if (ibhSuperAdmin) {
      await prisma.user.update({
        where: { id: ibhSuperAdmin.id },
        data: {
          username: "ibh_superadmin",
          email: "superadmin@ibh.ae",
          passwordHash: superAdminHash,
          status: "ACTIVE",
        },
      });
      console.log(`✅ IBH Super Admin updated (username: ibh_superadmin, pass: ${superAdminPassword})`);
    }
  }

  console.log("🎉 Database update completed successfully!");
}

main()
  .catch((err) => {
    console.error("❌ Database update failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

