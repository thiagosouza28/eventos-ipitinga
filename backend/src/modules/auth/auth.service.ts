import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { Secret, SignOptions } from "jsonwebtoken";
import type { Prisma } from "@/prisma/generated/client";

import { env } from "../../config/env";
import { RolePermissionPresets } from "../../config/permissions";
import { prisma } from "../../lib/prisma";
import { AppError, UnauthorizedError } from "../../utils/errors";
import { buildPermissionMap, toPermissionEntry } from "../../utils/permissions";
import { sanitizeCpf } from "../../utils/mask";
import { emailService } from "../../services/email.service";
import { generateTemporaryPassword } from "../../utils/password";

const userInclude = {
  ministries: {
    include: { ministry: true }
  },
  profile: {
    include: { permissions: true }
  }
} as const;

type UserWithRelations = Prisma.UserGetPayload<{ include: typeof userInclude }>;

export class AuthService {
  async login(identifier: string, password: string) {
    const user = await this.findByIdentifier(identifier);
    if (!user) {
      throw new UnauthorizedError("Credenciais invalidas");
    }
    if (user.status === "INACTIVE") {
      throw new UnauthorizedError("Usuario desativado");
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedError("Credenciais invalidas");
    }

    return this.buildSession(user);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: userInclude
    });
    if (!user) {
      throw new UnauthorizedError();
    }

    const matches = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!matches) {
      throw new UnauthorizedError("Senha atual incorreta");
    }

    const passwordHash = await bcrypt.hash(newPassword, Number(env.PASSWORD_SALT_ROUNDS));
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        isTemporaryPassword: false,
        passwordUpdatedAt: new Date()
      },
      include: userInclude
    });

    return this.buildSession(updated);
  }

  async requestPasswordReset(identifier: string) {
    const user = await this.findByIdentifier(identifier);
    if (!user) {
      // Evitar revelar se o usuário existe ou não
      return;
    }
    if (!user.email) {
      throw new AppError("Usuário sem e-mail cadastrado. Procure o administrador.", 400);
    }

    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, Number(env.PASSWORD_SALT_ROUNDS));
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        isTemporaryPassword: true,
        passwordUpdatedAt: null
      }
    });

    await emailService.sendTemporaryPasswordEmail({
      to: user.email,
      name: user.name,
      temporaryPassword
    });
  }

  async getSession(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: userInclude
    });
    if (!user) {
      throw new UnauthorizedError();
    }
    return this.buildSession(user);
  }

  private async findByIdentifier(identifier: string) {
    const trimmed = identifier.trim();
    if (!trimmed) return null;

    const where = trimmed.includes("@")
      ? { email: trimmed.toLowerCase() }
      : (() => {
          const sanitized = sanitizeCpf(trimmed);
          if (!sanitized || sanitized.length !== 11) {
            return null;
          }
          return { cpf: sanitized };
        })();

    if (!where) {
      return null;
    }

    return prisma.user.findFirst({
      where,
      include: userInclude
    });
  }

  private buildSession(user: NonNullable<UserWithRelations>) {
    const ministryIds = user.ministries?.map((relation) => relation.ministryId) ?? [];
    const profilePermissions = user.profile?.permissions ?? [];
    const roleKey = user.role as keyof typeof RolePermissionPresets;
    const basePermissions =
      profilePermissions.length > 0 ? profilePermissions : RolePermissionPresets[roleKey] ?? [];
    const permissionMap = buildPermissionMap(basePermissions);

    const primaryMinistryId = user.ministryId ?? ministryIds[0] ?? null;

    const token = jwt.sign(
      {
        role: user.role,
        districtScopeId: user.districtScopeId,
        churchId: user.churchId,
        ministryId: primaryMinistryId,
        ministryIds,
        profileId: user.profileId,
        permissions: permissionMap,
        mustChangePassword: user.isTemporaryPassword
      },
      env.JWT_SECRET as Secret,
      {
        subject: user.id,
        expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"]
      }
    );

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        districtScopeId: user.districtScopeId,
        churchId: user.churchId,
        churchScopeId: user.churchId,
        ministryId: primaryMinistryId,
        cpf: user.cpf,
        phone: user.phone,
        mustChangePassword: user.isTemporaryPassword,
        status: user.status,
        photoUrl: user.photoUrl,
        profile: user.profile
          ? {
              id: user.profile.id,
              name: user.profile.name,
              description: user.profile.description,
              isActive: user.profile.isActive,
              permissions: user.profile.permissions.map(toPermissionEntry)
            }
          : null,
        ministries:
          user.ministries?.map((relation) => ({
            id: relation.ministryId,
            name: relation.ministry?.name ?? ""
          })) ?? []
      }
    };
  }
}

export const authService = new AuthService();
