import { prisma } from "../../lib/prisma";
import { AppError, ConflictError, NotFoundError } from "../../utils/errors";
import { toPermissionEntry } from "../../utils/permissions";
import { PermissionModules, type PermissionEntry } from "../../config/permissions";

// The target DB already has a `public.profiles` table used as a "user profile" table.
// This system uses the same table name for RBAC profiles; we separate them via a fixed sentinel `user_id`.
const RBAC_PROFILE_USER_ID = "00000000-0000-0000-0000-000000000000";

type ProfileInput = {
  name: string;
  description?: string | null;
  isActive?: boolean;
  permissions: PermissionEntry[];
};

type ProfileMeta = {
  description: string | null;
  isActive: boolean;
};

const parseProfileMeta = (value: string | null | undefined): ProfileMeta => {
  if (!value) return { description: null, isActive: true };
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== "object") {
      return { description: null, isActive: true };
    }

    const descriptionRaw = (parsed as any).description;
    const isActiveRaw = (parsed as any).isActive;

    const description =
      typeof descriptionRaw === "string"
        ? descriptionRaw.trim() || null
        : descriptionRaw === null
          ? null
          : null;
    const isActive = typeof isActiveRaw === "boolean" ? isActiveRaw : true;

    return { description, isActive };
  } catch {
    // Fallback: non-JSON values are treated as "no meta".
    return { description: null, isActive: true };
  }
};

const buildProfileMeta = (meta: Partial<ProfileMeta>) =>
  JSON.stringify({
    description: meta.description ?? null,
    isActive: meta.isActive ?? true
  });

const serializeProfile = (profile: any) => {
  const meta = parseProfileMeta(profile.avatarUrl);
  return {
    id: profile.id,
    name: profile.name,
    description: meta.description,
    isActive: meta.isActive,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
    permissions: profile.permissions?.map(toPermissionEntry) ?? []
  };
};

const mapPermissionData = (profileId: string, permission: PermissionEntry) => ({
  profileId,
  module: permission.module,
  canView: permission.canView,
  canCreate: permission.canCreate,
  canEdit: permission.canEdit,
  canDelete: permission.canDelete,
  canApprove: permission.canApprove,
  canDeactivate: permission.canDeactivate,
  canReport: permission.canReport,
  canFinancial: permission.canFinancial
});

export class ProfileService {
  private fullPermission(module: string): PermissionEntry {
    return {
      module,
      canView: true,
      canCreate: true,
      canEdit: true,
      canDelete: true,
      canApprove: true,
      canDeactivate: true,
      canReport: true,
      canFinancial: true
    };
  }

  private async ensureDefaultProfiles() {
    const defaults = [
      {
        name: "Administrador Geral",
        description: "Perfil com acesso total a todos os módulos.",
        permissions: PermissionModules.map((module) => this.fullPermission(module)),
        isActive: true
      }
    ];

    for (const preset of defaults) {
      const existing = await prisma.profile.findFirst({
        where: { userId: RBAC_PROFILE_USER_ID, name: preset.name }
      });
      if (!existing) {
        await prisma.profile.create({
          data: {
            userId: RBAC_PROFILE_USER_ID,
            name: preset.name,
            avatarUrl: buildProfileMeta({
              description: preset.description ?? null,
              isActive: preset.isActive ?? true
            }),
            permissions: {
              createMany: {
                data: preset.permissions.map((permission) => ({
                  module: permission.module,
                  canView: permission.canView,
                  canCreate: permission.canCreate,
                  canEdit: permission.canEdit,
                  canDelete: permission.canDelete,
                  canApprove: permission.canApprove,
                  canDeactivate: permission.canDeactivate,
                  canReport: permission.canReport,
                  canFinancial: permission.canFinancial
                }))
              }
            }
          }
        });
      }
    }
  }

  async list() {
    await this.ensureDefaultProfiles();
    const profiles = await prisma.profile.findMany({
      where: { userId: RBAC_PROFILE_USER_ID },
      orderBy: { createdAt: "desc" },
      include: { permissions: true }
    });
    return profiles.map(serializeProfile);
  }

  async getById(id: string) {
    const profile = await prisma.profile.findUnique({
      where: { id },
      include: { permissions: true }
    });
    if (!profile || profile.userId !== RBAC_PROFILE_USER_ID) {
      throw new NotFoundError("Perfil não encontrado");
    }
    return serializeProfile(profile);
  }

  async create(payload: ProfileInput) {
    const name = payload.name.trim();
    const existing = await prisma.profile.findFirst({
      where: { userId: RBAC_PROFILE_USER_ID, name }
    });
    if (existing) {
      throw new ConflictError("Já existe um perfil com este nome");
    }

    const result = await prisma.$transaction(async (tx) => {
      const profile = await tx.profile.create({
        data: {
          userId: RBAC_PROFILE_USER_ID,
          name,
          avatarUrl: buildProfileMeta({
            description: payload.description?.trim() ?? null,
            isActive: payload.isActive ?? true
          })
        }
      });

      if (payload.permissions?.length) {
        await tx.profilePermission.createMany({
          data: payload.permissions.map((permission) => mapPermissionData(profile.id, permission))
        });
      }

      return tx.profile.findUnique({
        where: { id: profile.id },
        include: { permissions: true }
      });
    });

    return serializeProfile(result);
  }

  async update(id: string, payload: Partial<ProfileInput>) {
    const profile = await prisma.profile.findUnique({ where: { id } });
    if (!profile || profile.userId !== RBAC_PROFILE_USER_ID) {
      throw new NotFoundError("Perfil não encontrado");
    }

    if (payload.name && payload.name.trim() !== profile.name) {
      const duplicated = await prisma.profile.findFirst({
        where: { userId: RBAC_PROFILE_USER_ID, name: payload.name.trim() }
      });
      if (duplicated && duplicated.id !== id) {
        throw new ConflictError("Já existe um perfil com este nome");
      }
    }

    const currentMeta = parseProfileMeta(profile.avatarUrl);
    const nextMeta: ProfileMeta = {
      description:
        payload.description !== undefined ? payload.description?.trim() ?? null : currentMeta.description,
      isActive: payload.isActive !== undefined ? payload.isActive : currentMeta.isActive
    };
    const avatarUrlUpdate =
      payload.description !== undefined || payload.isActive !== undefined ? buildProfileMeta(nextMeta) : undefined;

    const result = await prisma.$transaction(async (tx) => {
      await tx.profile.update({
        where: { id },
        data: {
          name: payload.name?.trim(),
          avatarUrl: avatarUrlUpdate
        }
      });

      if (payload.permissions) {
        await tx.profilePermission.deleteMany({ where: { profileId: id } });
        if (payload.permissions.length) {
          await tx.profilePermission.createMany({
            data: payload.permissions.map((permission) => mapPermissionData(id, permission))
          });
        }
      }

      return tx.profile.findUnique({
        where: { id },
        include: { permissions: true }
      });
    });

    return serializeProfile(result);
  }

  async setStatus(id: string, isActive: boolean) {
    const existing = await prisma.profile.findUnique({
      where: { id },
      include: { permissions: true }
    });
    if (!existing || existing.userId !== RBAC_PROFILE_USER_ID) {
      throw new NotFoundError("Perfil não encontrado");
    }

    const currentMeta = parseProfileMeta(existing.avatarUrl);
    const profile = await prisma.profile.update({
      where: { id },
      data: {
        avatarUrl: buildProfileMeta({ ...currentMeta, isActive })
      },
      include: { permissions: true }
    });
    return serializeProfile(profile);
  }

  async delete(id: string) {
    const profile = await prisma.profile.findUnique({ where: { id } });
    if (!profile || profile.userId !== RBAC_PROFILE_USER_ID) {
      throw new NotFoundError("Perfil não encontrado");
    }

    const inUse = await prisma.user.count({ where: { profileId: id } });
    if (inUse > 0) {
      throw new AppError("Não é possível excluir um perfil vinculado a usuários", 400);
    }

    await prisma.profilePermission.deleteMany({ where: { profileId: id } });
    await prisma.profile.delete({ where: { id } });
  }
}

export const profileService = new ProfileService();
