import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { Secret, SignOptions } from "jsonwebtoken";

import { env } from "../../config/env";
import { RolePermissionPresets } from "../../config/permissions";
import { prisma } from "../../lib/prisma";
import { UnauthorizedError } from "../../utils/errors";
import { buildPermissionMap, mergePermissionMap, toPermissionEntry } from "../../utils/permissions";

export class AuthService {
  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        ministries: {
          include: { ministry: true }
        },
        profile: {
          include: { permissions: true }
        },
        permissionsOverride: true
      }
    });
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

    const ministryIds = user.ministries?.map((relation) => relation.ministryId) ?? [];
    const profilePermissions = user.profile?.permissions ?? [];
    const basePermissions =
      profilePermissions.length > 0 ? profilePermissions : RolePermissionPresets[user.role] ?? [];
    const permissionMap = buildPermissionMap(basePermissions);
    const overrideEntries = user.permissionsOverride?.map(toPermissionEntry) ?? [];
    const resolvedPermissions =
      overrideEntries.length > 0 ? mergePermissionMap(permissionMap, overrideEntries) : permissionMap;

    const token = jwt.sign(
      {
        role: user.role,
        districtScopeId: user.districtScopeId,
        churchScopeId: user.churchScopeId,
        ministryIds,
        profileId: user.profileId,
        permissions: resolvedPermissions
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
        churchScopeId: user.churchScopeId,
        cpf: user.cpf,
        phone: user.phone,
        mustChangePassword: user.mustChangePassword,
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
        permissions: resolvedPermissions,
        permissionOverrides: overrideEntries,
        ministries: user.ministries?.map((relation) => ({
          id: relation.ministryId,
          name: relation.ministry?.name ?? ""
        })) ?? []
      }
    };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedError();
    }

    const matches = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!matches) {
      throw new UnauthorizedError("Senha atual incorreta");
    }

    const passwordHash = await bcrypt.hash(newPassword, Number(env.PASSWORD_SALT_ROUNDS));
    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        mustChangePassword: false
      }
    });
  }
}

export const authService = new AuthService();
