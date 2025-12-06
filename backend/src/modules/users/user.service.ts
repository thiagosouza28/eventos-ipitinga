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
  pixType?: string | null;
  pixKey?: string | null;
  pixOwnerName?: string | null;
  pixOwnerDocument?: string | null;
  pixBankName?: string | null;
  pixStatus?: string | null;
};

const normalizeCpf = (value?: string | null) => {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  return digits || null;
};

const normalizeDocument = (value?: string | null) => {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  return digits || null;
};

const hasPixPayload = (payload: Partial<UserInput>) =>
  Boolean(
    payload.pixType ||
      payload.pixKey ||
      payload.pixOwnerName ||
      payload.pixOwnerDocument ||
      payload.pixBankName ||
      payload.pixStatus
  );

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
  }
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

const serializeUser = (user: any) => {
  const profile = user.profile
    ? {
        id: user.profile.id,
        name: user.profile.name,
        description: user.profile.description,
        isActive: user.profile.isActive,
        permissions: user.profile.permissions?.map(toPermissionEntry) ?? []
      }
    : null;

  return {
    ...user,
    profile,
    churchScope: user.church ?? user.churchScope ?? null,
    churchId: user.churchId ?? user.churchScopeId ?? null,
    ministries: user.ministries?.map((relation: any) => ({
      id: relation.ministryId,
      name: relation.ministry?.name ?? ""
    })) ?? [],
    pixType: user.pixType ?? null,
    pixKey: user.pixKey ?? null,
    pixOwnerName: user.pixOwnerName ?? null,
    pixOwnerDocument: user.pixOwnerDocument ?? null,
    pixBankName: user.pixBankName ?? null,
    pixStatus: user.pixStatus ?? null
  };
};

export class UserService {
  async list() {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      include: userIncludes
    });

    return users.map(serializeUser);
  }

  async create(payload: UserInput, actorUser?: { id?: string; role?: string }) {
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

    if (payload.role === "AdminDistrital" && hasPixPayload(payload) && actorUser?.role !== "AdminGeral") {
      throw new AppError("Apenas Administradores Gerais podem definir chave PIX de administradores distritais.", 403);
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
        passwordUpdatedAt: null,
        pixType: payload.pixType ?? null,
        pixKey: payload.pixKey?.trim() ?? null,
        pixOwnerName: payload.pixOwnerName?.trim() ?? null,
        pixOwnerDocument: normalizeDocument(payload.pixOwnerDocument),
        pixBankName: payload.pixBankName?.trim() ?? null,
        pixStatus: (payload.pixStatus as any) ?? "PENDING"
      },
      include: userIncludes
    });

    await syncMinistries(user.id, payload.ministryIds);

    await auditService.log({
      actorUserId: actorUser?.id,
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

  async update(id: string, payload: Partial<UserInput>, actorUser?: { id?: string; role?: string }) {
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

    if (user.role === "AdminDistrital" && hasPixPayload(payload) && actorUser?.role !== "AdminGeral") {
      throw new AppError("Apenas Administradores Gerais podem editar a chave PIX de administradores distritais.", 403);
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
        status: payload.status ?? undefined,
        pixType: payload.pixType ?? undefined,
        pixKey: payload.pixKey !== undefined ? payload.pixKey?.trim() ?? null : undefined,
        pixOwnerName: payload.pixOwnerName !== undefined ? payload.pixOwnerName?.trim() ?? null : undefined,
        pixOwnerDocument:
          payload.pixOwnerDocument !== undefined ? normalizeDocument(payload.pixOwnerDocument) : undefined,
        pixBankName: payload.pixBankName !== undefined ? payload.pixBankName?.trim() ?? null : undefined,
        pixStatus: (payload.pixStatus as any) ?? undefined
      } as any,
      include: userIncludes
    });

    if (payload.ministryIds) {
      await syncMinistries(id, payload.ministryIds);
    }

    await auditService.log({
      actorUserId: actorUser?.id,
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
