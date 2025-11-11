import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";

import { prisma } from "../../lib/prisma";
import { ConflictError, NotFoundError, AppError } from "../../utils/errors";
import { auditService } from "../../services/audit.service";
import { env } from "../../config/env";

const generateTemporaryPassword = () => {
  const candidate = randomBytes(8).toString("base64url");
  return candidate.slice(0, 10);
};

type UserInput = {
  name: string;
  email: string;
  cpf?: string | null;
  phone?: string | null;
  role: string;
  districtScopeId?: string | null;
  churchScopeId?: string | null;
  ministryIds?: string[];
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

export class UserService {
  async list() {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        districtScope: true,
        churchScope: true,
        ministries: {
          include: { ministry: true }
        }
      }
    });

    return users.map((user) => ({
      ...user,
      ministries: user.ministries.map((relation) => ({
        id: relation.ministryId,
        name: relation.ministry?.name ?? ""
      }))
    }));
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

    const user = await prisma.user.create({
      data: {
        name: payload.name.trim(),
        email,
        cpf,
        phone: payload.phone?.trim() ?? null,
        role: payload.role,
        districtScopeId: payload.districtScopeId ?? null,
        churchScopeId: payload.churchScopeId ?? null,
        passwordHash,
        mustChangePassword: true
      },
      include: {
        ministries: {
          include: { ministry: true }
        }
      }
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
      user: {
        ...user,
        ministries: payload.ministryIds ?? []
      },
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

    const updated = await prisma.user.update({
      where: { id },
      data: {
        name: payload.name?.trim(),
        email: payload.email?.toLowerCase().trim(),
        cpf: payload.cpf ? normalizeCpf(payload.cpf) : payload.cpf === null ? null : undefined,
        phone: payload.phone !== undefined ? payload.phone?.trim() ?? null : undefined,
        role: payload.role,
        districtScopeId: payload.districtScopeId ?? undefined,
        churchScopeId: payload.churchScopeId ?? undefined
      }
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

    return updated;
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
        mustChangePassword: true
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
