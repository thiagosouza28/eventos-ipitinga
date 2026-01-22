import { PrismaClient } from "@/prisma/generated/client";

const prisma = new PrismaClient();

const main = async () => {
  if (process.env.SKIP_SEED === "1") {
    console.log("[seed] SKIP_SEED=1, skipping.");
    return;
  }

  // TODO: add seed data for local development/testing.
  console.log("[seed] No seed data configured.");
};

main()
  .catch((error) => {
    console.error("[seed] Failed to run seed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
