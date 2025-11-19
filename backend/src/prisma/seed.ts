import bcrypt from "bcryptjs";

import { env } from "../config/env";
import { Role } from "../config/roles";
import type { PermissionEntry } from "../config/permissions";
import { RolePermissionPresets } from "../config/permissions";
import { prisma } from "../lib/prisma";
import { DEFAULT_SYSTEM_CONFIG } from "../modules/system-config/system-config.types";

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

const ensureProfile = async (
  name: string,
  description: string,
  permissions: PermissionEntry[],
  isActive = true
) => {
  const existing = await prisma.profile.findUnique({ where: { name } });
  if (existing) {
    await prisma.profilePermission.deleteMany({ where: { profileId: existing.id } });
    if (permissions.length) {
      await prisma.profilePermission.createMany({
        data: permissions.map((permission) => ({
          profileId: existing.id,
          ...permission
        }))
      });
    }
    return existing;
  }

  const profile = await prisma.profile.create({
    data: {
      name,
      description,
      isActive
    }
  });

  if (permissions.length) {
    await prisma.profilePermission.createMany({
      data: permissions.map((permission) => ({
        profileId: profile.id,
        ...permission
      }))
    });
  }

  return profile;
};

const ensureSystemConfig = async () => {
  const existing = await prisma.systemConfig.findFirst();
  if (existing) {
    if (!existing.settings || Object.keys(existing.settings as Record<string, unknown>).length === 0) {
      return prisma.systemConfig.update({
        where: { id: existing.id },
        data: { settings: DEFAULT_SYSTEM_CONFIG }
      });
    }
    return existing;
  }
  return prisma.systemConfig.create({
    data: {
      settings: DEFAULT_SYSTEM_CONFIG
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
  profileId?: string | null;
};

const ensureUser = async ({
  name,
  email,
  password,
  role,
  districtScopeId,
  churchScopeId,
  profileId
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
      churchScopeId: churchScopeId ?? null,
      profileId: profileId ?? null
    },
    update: {
      name,
      role,
      passwordHash,
      districtScopeId: districtScopeId ?? null,
      churchScopeId: churchScopeId ?? null,
      profileId: profileId ?? null
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
  await ensureSystemConfig();

  const adminGeneralProfile = await ensureProfile(
    "Administrador Geral",
    "Acesso completo ao painel.",
    RolePermissionPresets.AdminGeral
  );

  const districtProfile = await ensureProfile(
    "Administrador Distrital",
    "Gerencia eventos e registros do distrito.",
    RolePermissionPresets.AdminDistrital
  );

  const directorProfile = await ensureProfile(
    "Diretor Local",
    "Acompanha registros da igreja local.",
    RolePermissionPresets.DiretorLocal
  );

  const financeProfile = await ensureProfile(
    "Tesoureiro",
    "Respons�vel pelo caixa e relat�rios financeiros.",
    RolePermissionPresets.Tesoureiro
  );
  const ministryCoordinatorProfile = await ensureProfile(
    "Coordenador de Minist�rio",
    "Gere inscri��es do seu minist�rio.",
    RolePermissionPresets.CoordenadorMinisterio
  );
  const profileMap: Record<Role, string> = {
    AdminGeral: adminGeneralProfile.id,
    AdminDistrital: districtProfile.id,
    DiretorLocal: directorProfile.id,
    Tesoureiro: financeProfile.id,
    CoordenadorMinisterio: ministryCoordinatorProfile.id
  };

  const seededUsers: EnsureUserInput[] = [
    {
      name: "Admin Geral",
      email: env.ADMIN_EMAIL,
      password: env.ADMIN_PASSWORD,
      role: "AdminGeral",
      profileId: profileMap.AdminGeral
    },
    {
      name: "Helena Rocha",
      email: "distrital.norte@catre.local",
      password: env.ADMIN_PASSWORD,
      role: "AdminDistrital",
      districtScopeId: north.id,
      profileId: profileMap.AdminDistrital
    },
    {
      name: "Ricardo Lima",
      email: "distrital.sul@catre.local",
      password: env.ADMIN_PASSWORD,
      role: "AdminDistrital",
      districtScopeId: south.id,
      profileId: profileMap.AdminDistrital
    },
    {
      name: "Daniela Carvalho",
      email: "diretora.central@catre.local",
      password: env.ADMIN_PASSWORD,
      role: "DiretorLocal",
      churchScopeId: centralChurch.id,
      profileId: profileMap.DiretorLocal
    },
    {
      name: "Juliana Araujo",
      email: "diretora.esperanca@catre.local",
      password: env.ADMIN_PASSWORD,
      role: "DiretorLocal",
      churchScopeId: hopeChurch.id,
      profileId: profileMap.DiretorLocal
    },
    {
      name: "Tesouraria CATRE",
      email: "tesouraria@catre.local",
      password: env.ADMIN_PASSWORD,
      role: "Tesoureiro",
      profileId: profileMap.Tesoureiro
    }
  ];

  const targetAdminEmail = "thgdsztls@gmail.com";
  const hasTargetAdmin = seededUsers.some(
    (user) => user.email?.toLowerCase() === targetAdminEmail.toLowerCase()
  );
  if (!hasTargetAdmin) {
    seededUsers.push({
      name: "Thiago Santos",
      email: targetAdminEmail,
      password: env.ADMIN_PASSWORD,
      role: "AdminGeral",
      profileId: profileMap.AdminGeral
    });
  }

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


