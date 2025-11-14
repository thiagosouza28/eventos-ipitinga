import { prisma } from "../../lib/prisma";
import { AppError, ConflictError, NotFoundError } from "../../utils/errors";
import { toPermissionEntry } from "../../utils/permissions";
import type { PermissionEntry } from "../../config/permissions";

type ProfileInput = {
  name: string;
  description?: string | null;
  isActive?: boolean;
  permissions: PermissionEntry[];
};

const serializeProfile = (profile: any) => ({
  id: profile.id,
  name: profile.name,
  description: profile.description,
  isActive: profile.isActive,
  createdAt: profile.createdAt,
  updatedAt: profile.updatedAt,
  permissions: profile.permissions?.map(toPermissionEntry) ?? []
});

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
  async list() {
    const profiles = await prisma.profile.findMany({
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
    if (!profile) {
      throw new NotFoundError("Perfil nao encontrado");
    }
    return serializeProfile(profile);
  }

  async create(payload: ProfileInput) {
    const existing = await prisma.profile.findUnique({ where: { name: payload.name.trim() } });
    if (existing) {
      throw new ConflictError("Ja existe um perfil com este nome");
    }

    const result = await prisma.$transaction(async (tx) => {
      const profile = await tx.profile.create({
        data: {
          name: payload.name.trim(),
          description: payload.description?.trim() ?? null,
          isActive: payload.isActive ?? true
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
    if (!profile) {
      throw new NotFoundError("Perfil nao encontrado");
    }

    if (payload.name && payload.name.trim() !== profile.name) {
      const duplicated = await prisma.profile.findUnique({ where: { name: payload.name.trim() } });
      if (duplicated && duplicated.id !== id) {
        throw new ConflictError("Ja existe um perfil com este nome");
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.profile.update({
        where: { id },
        data: {
          name: payload.name?.trim(),
          description: payload.description !== undefined ? payload.description?.trim() ?? null : undefined,
          isActive: payload.isActive ?? undefined
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
    const profile = await prisma.profile.update({
      where: { id },
      data: { isActive },
      include: { permissions: true }
    });
    return serializeProfile(profile);
  }

  async delete(id: string) {
    const inUse = await prisma.user.count({ where: { profileId: id } });
    if (inUse > 0) {
      throw new AppError("Nao e possivel excluir um perfil vinculado a usuarios", 400);
    }

    await prisma.profilePermission.deleteMany({ where: { profileId: id } });
    await prisma.profile.delete({ where: { id } });
  }
}

export const profileService = new ProfileService();
