import bcrypt from "bcryptjs";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const getEnv = (key, fallback) => {
  const value = process.env[key];
  if (value === undefined || value === null || String(value).trim() === "") {
    return fallback;
  }
  return value;
};

const main = async () => {
  if (process.env.SKIP_SEED === "1") {
    console.log("[seed] SKIP_SEED=1, skipping.");
    return;
  }

  const districtName = getEnv("SEED_DISTRICT_NAME", "Distrito Central");
  const churchName = getEnv("SEED_CHURCH_NAME", "Igreja Sede");
  const ministryName = getEnv("SEED_MINISTRY_NAME", "Ministério Geral");

  const district = await prisma.district.upsert({
    where: { name: districtName },
    update: {},
    create: { name: districtName }
  });

  await prisma.church.upsert({
    where: {
      name_districtId: {
        name: churchName,
        districtId: district.id
      }
    },
    update: {},
    create: {
      name: churchName,
      districtId: district.id
    }
  });

  const ministry = await prisma.ministry.upsert({
    where: { name: ministryName },
    update: {},
    create: {
      name: ministryName,
      description: "Ministério padrão"
    }
  });

  const existingConfig = await prisma.systemConfig.findFirst();
  if (!existingConfig) {
    await prisma.systemConfig.create({
      data: {
        settings: {}
      }
    });
  }

  const adminEmail = String(getEnv("ADMIN_EMAIL", "admin@local.test")).toLowerCase();
  const adminPassword = String(getEnv("ADMIN_PASSWORD", "Admin123!"));
  const adminName = getEnv("ADMIN_NAME", "Admin Geral");
  const saltRounds = Number(getEnv("PASSWORD_SALT_ROUNDS", "10"));

  const adminExists = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!adminExists) {
    const passwordHash = await bcrypt.hash(adminPassword, saltRounds);
    await prisma.user.create({
      data: {
        name: adminName,
        email: adminEmail,
        passwordHash,
        role: "AdminGeral",
        status: "ACTIVE",
        ministryId: ministry.id,
        isTemporaryPassword: false,
        passwordUpdatedAt: new Date()
      }
    });
    console.log(`[seed] Admin criado: ${adminEmail}`);
  } else {
    console.log(`[seed] Admin já existe: ${adminEmail}`);
  }

  console.log("[seed] Seed concluído.");
};

main()
  .catch((error) => {
    console.error("[seed] Falha ao executar seed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
