import bcrypt from "bcryptjs";
import { UserStatus } from "@/prisma/generated/client";

import { prisma } from "../../lib/prisma";
import { ConflictError, NotFoundError, AppError } from "../../utils/errors";
import { auditService } from "../../services/audit.service";
import { env } from "../../config/env";
import { storageService } from "../../storage/storage.service";
import { toPermissionEntry } from "../../utils/permissions";
import { generateTemporaryPassword } from "../../utils/password";

type UserInput = {
  name: string;
  email: string;
  cpf?: string | null;
  phone?: string | null;
  role: string;
  districtScopeId?: string | null;
  churchScopeId?: string | null;
  ministryIds?: string[];
  photoUrl?: string | null;
  profileId?: string | null;
  status?: UserStatus;
};

const normalizeCpf = (value?: string | null) => {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  return digits || null;
};

const syncMinistries = async (userId: string, ministryIds?: string[]) => {
  await prisma.ministryUser.deleteMany({ where: { userId } });
  if (ministryIds && ministryIds.length) {
    const uniqueIds = Array.from(new Set(ministryIds));
    await prisma.ministryUser.createMany({
      data: uniqueIds.map((ministryId) => ({ userId, ministryId }))
    });
  }
};

const userIncludes = {
  districtScope: true,
  church: true,
  ministries: {
    include: { ministry: true }
  },
  profile: {
    include: { permissions: true }
  },
  permissionsOverride: true
} as const;

const ensureActiveProfile = async (profileId?: string | null) => {
  if (!profileId) {
    return null;
  }
  const profile = await prisma.profile.findFirst({
    where: { id: profileId, isActive: true }
  });
  if (!profile) {
    throw new AppError("Perfil informado nao encontrado ou inativo", 400);
  }
  return profile.id;
};

const serializeUser = (user: any) => ({
  ...user,
  churchScope: user.church ?? user.churchScope ?? null,
  churchId: user.churchId ?? user.churchScopeId ?? null,
  ministries: user.ministries?.map((relation: any) => ({
    id: relation.ministryId,
    name: relation.ministry?.name ?? ""
  })) ?? [],
  permissionOverrides: user.permissionsOverride?.map(toPermissionEntry) ?? []
});

export class UserService {
  async list() {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      include: userIncludes
    });

    return users.map(serializeUser);
  }

  async create(payload: UserInput, actorUserId?: string) {
    const email = payload.email.toLowerCase().trim();
    const cpf = normalizeCpf(payload.cpf);
    if (cpf) {
      const cpfExists = await prisma.user.findFirst({ where: { cpf } });
      if (cpfExists) {
        throw new ConflictError("CPF ja cadastrado");
      }
    }
    const emailExists = await prisma.user.findUnique({ where: { email } });
    if (emailExists) {
      throw new ConflictError("E-mail ja cadastrado");
    }

    if (payload.role === "CoordenadorMinisterio" && (!payload.ministryIds || !payload.ministryIds.length)) {
      throw new AppError("Selecione ao menos um ministerio para o usuario", 400);
    }

    if (payload.ministryIds?.length) {
      const count = await prisma.ministry.count({ where: { id: { in: payload.ministryIds } } });
      if (count !== payload.ministryIds.length) {
        throw new AppError("Ministerio informado nao encontrado", 400);
      }
    }

    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, Number(env.PASSWORD_SALT_ROUNDS));

    const storedPhoto = payload.photoUrl
      ? await storageService.saveBase64Image(payload.photoUrl)
      : null;
    const profileId = await ensureActiveProfile(payload.profileId ?? null);

    const primaryMinistryId = payload.ministryIds?.[0] ?? null;

    const user = await prisma.user.create({
      data: {
        name: payload.name.trim(),
        email,
        cpf,
        phone: payload.phone?.trim() ?? null,
        role: payload.role,
        districtScopeId: payload.districtScopeId ?? null,
        churchId: payload.churchScopeId ?? null,
        ministryId: primaryMinistryId,
        photoUrl: storedPhoto,
        profileId,
        status: payload.status ?? UserStatus.ACTIVE,
        passwordHash,
        isTemporaryPassword: true,
        passwordUpdatedAt: null
      },
      include: userIncludes
    });

    await syncMinistries(user.id, payload.ministryIds);

    await auditService.log({
      actorUserId,
      action: "USER_CREATED",
      entity: "user",
      entityId: user.id,
      metadata: { role: user.role }
    });

    return {
      user: serializeUser(user),
      temporaryPassword
    };
  }

  async update(id: string, payload: Partial<UserInput>, actorUserId?: string) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundError("Usuario nao encontrado");
    }

    if (payload.email && payload.email.toLowerCase().trim() !== user.email) {
      const email = payload.email.toLowerCase().trim();
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing && existing.id !== id) {
        throw new ConflictError("E-mail ja cadastrado");
      }
    }

    if (payload.cpf) {
      const cpf = normalizeCpf(payload.cpf);
      if (cpf && cpf !== user.cpf) {
        const cpfExists = await prisma.user.findFirst({ where: { cpf } });
        if (cpfExists && cpfExists.id !== id) {
          throw new ConflictError("CPF ja cadastrado");
        }
      }
    }

    if (payload.role === "CoordenadorMinisterio" && (!payload.ministryIds || !payload.ministryIds.length)) {
      throw new AppError("Selecione ao menos um ministerio para o usuario", 400);
    }

    let photoUrlUpdate: string | null | undefined;
    if (payload.photoUrl !== undefined) {
      if (payload.photoUrl === null) {
        await storageService.deleteByUrl(user.photoUrl);
        photoUrlUpdate = null;
      } else {
        const stored = await storageService.saveBase64Image(payload.photoUrl);
        if (stored && stored !== user.photoUrl) {
          await storageService.deleteByUrl(user.photoUrl);
        }
        photoUrlUpdate = stored;
      }
    }

    let profileIdUpdate: string | null | undefined;
    if (payload.profileId !== undefined) {
      profileIdUpdate = await ensureActiveProfile(payload.profileId);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        name: payload.name?.trim(),
        email: payload.email?.toLowerCase().trim(),
        cpf: payload.cpf ? normalizeCpf(payload.cpf) : payload.cpf === null ? null : undefined,
        phone: payload.phone !== undefined ? payload.phone?.trim() ?? null : undefined,
        role: payload.role,
        districtScopeId: payload.districtScopeId ?? undefined,
        churchId: payload.churchScopeId ?? undefined,
        ministryId: payload.ministryIds ? payload.ministryIds[0] ?? null : undefined,
        photoUrl: photoUrlUpdate,
        profileId: profileIdUpdate,
        status: payload.status ?? undefined
      },
      include: userIncludes
    });

    if (payload.ministryIds) {
      await syncMinistries(id, payload.ministryIds);
    }

    await auditService.log({
      actorUserId,
      action: "USER_UPDATED",
      entity: "user",
      entityId: id,
      metadata: payload
    });

    return serializeUser(updated);
  }

  async updateStatus(id: string, status: UserStatus, actorUserId?: string) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundError("Usuario nao encontrado");
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { status },
      include: userIncludes
    });

    await auditService.log({
      actorUserId,
      action: "USER_STATUS_UPDATED",
      entity: "user",
      entityId: id,
      metadata: { status }
    });

    return serializeUser(updated);
  }

  async delete(id: string, actorUserId?: string) {
    if (actorUserId && actorUserId === id) {
      throw new AppError("Nao e possivel excluir o proprio usuario", 400);
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundError("Usuario nao encontrado");
    }

    await prisma.ministryUser.deleteMany({ where: { userId: id } });
    await prisma.user.delete({ where: { id } });

    await auditService.log({
      actorUserId,
      action: "USER_DELETED",
      entity: "user",
      entityId: id
    });
  }

  async resetPassword(id: string, actorUserId?: string) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundError("Usuario nao encontrado");
    }

    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, Number(env.PASSWORD_SALT_ROUNDS));
    await prisma.user.update({
      where: { id },
      data: {
        passwordHash,
        isTemporaryPassword: true,
        passwordUpdatedAt: null
      }
    });

    await auditService.log({
      actorUserId,
      action: "USER_RESET_PASSWORD",
      entity: "user",
      entityId: id
    });

    return { temporaryPassword };
  }
}

export const userService = new UserService();
