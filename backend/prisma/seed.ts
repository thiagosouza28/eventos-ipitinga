import bcrypt from "bcryptjs";

import { env } from "../src/config/env";
import { Role } from "../src/config/roles";
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

const ensureMinistry = async (name: string, description?: string | null) => {
  const existing = await prisma.ministry.findUnique({ where: { name } });
  if (existing) return existing;
  return prisma.ministry.create({
    data: {
      name,
      description: description ?? null,
      isActive: true
    }
  });
};

const ensureEvent = async (ministryId: string) => {
  const slug = "retiro-espiritual-2025";
  const existing = await prisma.event.findUnique({ where: { slug } });
  if (existing) {
    if (!existing.ministryId) {
      return prisma.event.update({
        where: { id: existing.id },
        data: { ministryId }
      });
    }
    return existing;
  }
  return prisma.event.create({
    data: {
      title: "Retiro Espiritual 2025",
      description: "Encontro anual de lideres CATRE.",
      startDate: new Date("2025-06-20T18:00:00.000Z"),
      endDate: new Date("2025-06-23T18:00:00.000Z"),
      location: "CATRE Ipitinga, MG",
      priceCents: 25000,
      minAgeYears: 12,
      slug,
      ministryId
    }
  });
};

type EnsureUserInput = {
  name: string;
  email: string;
  password: string;
  role: Role;
  districtScopeId?: string | null;
  churchScopeId?: string | null;
};

const ensureUser = async ({
  name,
  email,
  password,
  role,
  districtScopeId,
  churchScopeId
}: EnsureUserInput) => {
  const passwordHash = await bcrypt.hash(password, env.PASSWORD_SALT_ROUNDS);
  return prisma.user.upsert({
    where: { email },
    create: {
      name,
      email,
      passwordHash,
      role,
      districtScopeId: districtScopeId ?? null,
      churchScopeId: churchScopeId ?? null
    },
    update: {
      name,
      role,
      passwordHash,
      districtScopeId: districtScopeId ?? null,
      churchScopeId: churchScopeId ?? null
    }
  });
};

const run = async () => {
  console.log("[seed] Starting database seed...");

  const north = await ensureDistrict("Distrito Norte");
  const south = await ensureDistrict("Distrito Sul");

  const centralChurch = await ensureChurch("Igreja Central", north.id);
  const hopeChurch = await ensureChurch("Igreja Esperanca", south.id);

  const youthMinistry = await ensureMinistry("Ministério Jovem", "Coordenação geral das atividades jovens.");
  const musicMinistry = await ensureMinistry("Ministério de Música", "Equipe de louvor e adoração.");

  const event = await ensureEvent(youthMinistry.id);

  const seededUsers: EnsureUserInput[] = [
    {
      name: "Admin Geral",
      email: env.ADMIN_EMAIL,
      password: env.ADMIN_PASSWORD,
      role: "AdminGeral"
    },
    {
      name: "Helena Rocha",
      email: "distrital.norte@catre.local",
      password: env.ADMIN_PASSWORD,
      role: "AdminDistrital",
      districtScopeId: north.id
    },
    {
      name: "Ricardo Lima",
      email: "distrital.sul@catre.local",
      password: env.ADMIN_PASSWORD,
      role: "AdminDistrital",
      districtScopeId: south.id
    },
    {
      name: "Daniela Carvalho",
      email: "diretora.central@catre.local",
      password: env.ADMIN_PASSWORD,
      role: "DiretorLocal",
      churchScopeId: centralChurch.id
    },
    {
      name: "Juliana Araujo",
      email: "diretora.esperanca@catre.local",
      password: env.ADMIN_PASSWORD,
      role: "DiretorLocal",
      churchScopeId: hopeChurch.id
    },
    {
      name: "Tesouraria CATRE",
      email: "tesouraria@catre.local",
      password: env.ADMIN_PASSWORD,
      role: "Tesoureiro"
    }
  ];

  const users = await Promise.all(seededUsers.map((user) => ensureUser(user)));

  console.log("[seed] Done.");
  console.table({
    "Evento exemplo": event.slug,
    "Igreja 1": centralChurch.name,
    "Igreja 2": hopeChurch.name,
    "Usuario Admin": env.ADMIN_EMAIL,
    "Ministerio padrao": youthMinistry.name
  });
  console.table(
    users.map((user) => ({
      Nome: user.name,
      Email: user.email,
      Role: user.role,
      Distrito: user.districtScopeId ?? "-",
      Igreja: user.churchScopeId ?? "-"
    }))
  );
};

run()
  .catch((error) => {
    console.error("Erro ao executar seed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
