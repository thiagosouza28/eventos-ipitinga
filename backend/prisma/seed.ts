import bcrypt from "bcryptjs";

import { env } from "../src/config/env";
import { prisma } from "../src/lib/prisma";

const ensureDistrict = async (name: string) => {
  const existing = await prisma.district.findUnique({ where: { name } });
  if (existing) return existing;
  return prisma.district.create({ data: { name } });
};

const ensureChurch = async (name: string, districtId: string) => {
  const existing = await prisma.church.findUnique({
    where: { name_districtId: { name, districtId } }
  });
  if (existing) return existing;
  return prisma.church.create({
    data: {
      name,
      districtId
    }
  });
};

const ensureEvent = async () => {
  const slug = "retiro-espiritual-2025";
  const existing = await prisma.event.findUnique({ where: { slug } });
  if (existing) return existing;
  return prisma.event.create({
    data: {
      title: "Retiro Espiritual 2025",
      description: "Encontro anual de lideres CATRE.",
      startDate: new Date("2025-06-20T18:00:00.000Z"),
      endDate: new Date("2025-06-23T18:00:00.000Z"),
      location: "CATRE Ipitinga, MG",
      priceCents: 25000,
      minAgeYears: 12,
      slug
    }
  });
};

const ensureUser = async (
  name: string,
  email: string,
  password: string,
  role: string
) => {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return existing;
  const passwordHash = await bcrypt.hash(password, env.PASSWORD_SALT_ROUNDS);
  return prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role
    }
  });
};

const run = async () => {
  console.log("[seed] Starting database seed...");

  const north = await ensureDistrict("Distrito Norte");
  const south = await ensureDistrict("Distrito Sul");

  const centralChurch = await ensureChurch("Igreja Central", north.id);
  const hopeChurch = await ensureChurch("Igreja Esperanca", south.id);

  const event = await ensureEvent();

  const adminUser = await ensureUser("Admin Geral", env.ADMIN_EMAIL, env.ADMIN_PASSWORD, "AdminGeral");
  const supportUser = await ensureUser(
    "Usuario CATRE",
    "thgdsztls@gmail.com",
    "281021",
    "AdminDistrital"
  );

  console.log("[seed] Done.");
  console.table({
    "Evento exemplo": event.slug,
    "Igreja 1": centralChurch.name,
    "Igreja 2": hopeChurch.name,
    "Usuario Admin": adminUser.email,
    "Usuario Suporte": supportUser.email
  });
};

run()
  .catch((error) => {
    console.error("Erro ao executar seed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
