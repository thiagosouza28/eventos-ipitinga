import bcrypt from "bcryptjs";

import { env } from "../config/env";
import { Role } from "../config/roles";
import type { PermissionEntry } from "../config/permissions";
import { prisma } from "../lib/prisma";

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

const makePermission = (
  module: string,
  flags: Partial<Omit<PermissionEntry, "module">> = {}
): PermissionEntry => ({
  module,
  canView: flags.canView ?? false,
  canCreate: flags.canCreate ?? false,
  canEdit: flags.canEdit ?? false,
  canDelete: flags.canDelete ?? false,
  canApprove: flags.canApprove ?? false,
  canDeactivate: flags.canDeactivate ?? false,
  canReport: flags.canReport ?? false,
  canFinancial: flags.canFinancial ?? false
});

const fullAccess = (module: string) =>
  makePermission(module, {
    canView: true,
    canCreate: true,
    canEdit: true,
    canDelete: true,
    canApprove: true,
    canDeactivate: true,
    canReport: true,
    canFinancial: true
  });

const viewAccess = (module: string, flags?: Partial<Omit<PermissionEntry, "module">>) =>
  makePermission(module, { canView: true, ...(flags ?? {}) });

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

  const adminGeneralProfile = await ensureProfile(
    "Administrador Geral",
    "Acesso completo ao painel.",
    [
      "dashboard",
      "users",
      "profiles",
      "registrations",
      "events",
      "financial",
      "reports",
      "checkin"
    ].map((module) => fullAccess(module))
  );

  const districtProfile = await ensureProfile(
    "Administrador Distrital",
    "Gerencia eventos e registros do distrito.",
    [
      viewAccess("dashboard"),
      viewAccess("events", { canEdit: true, canCreate: true }),
      viewAccess("registrations", {
        canCreate: true,
        canEdit: true,
        canApprove: true,
        canDeactivate: true,
        canReport: true
      }),
      viewAccess("financial", { canReport: true, canFinancial: true }),
      viewAccess("reports", { canReport: true }),
      viewAccess("checkin", { canApprove: true })
    ]
  );

  const directorProfile = await ensureProfile(
    "Diretor Local",
    "Acompanha registros da igreja local.",
    [
      viewAccess("dashboard"),
      viewAccess("registrations", { canCreate: true, canEdit: true }),
      viewAccess("reports", { canReport: true }),
      viewAccess("checkin", { canApprove: true })
    ]
  );

  const financeProfile = await ensureProfile(
    "Tesoureiro",
    "Responsável pelo caixa e relatórios financeiros.",
    [
      viewAccess("dashboard"),
      viewAccess("financial", { canReport: true, canFinancial: true }),
      viewAccess("registrations", { canReport: true }),
      viewAccess("reports", { canReport: true })
    ]
  );

  const ministryCoordinatorProfile = await ensureProfile(
    "Coordenador de Ministério",
    "Gere inscrições do seu ministério.",
    [
      viewAccess("dashboard"),
      viewAccess("registrations", { canCreate: true, canEdit: true, canApprove: true }),
      viewAccess("events"),
      viewAccess("reports", { canReport: true })
    ]
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
