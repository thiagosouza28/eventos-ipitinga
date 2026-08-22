import type { NextFunction, Request, Response } from "express";

import { prisma } from "../lib/prisma";
import { RolePermissionPresets } from "../config/permissions";
import { buildPermissionMap } from "../utils/permissions";
import { UnauthorizedError } from "../utils/errors";
import { env } from "../config/env";
import { cacheGetOrSet } from "../utils/cache";

export const hydratePermissions = async (request: Request, _response: Response, next: NextFunction) => {
  if (!request.user) {
    throw new UnauthorizedError();
  }

  const user = request.user;
  const userId = user.id;

  // Se já houver mapa no token, aproveitamos para evitar consultas desnecessárias
  if (user.permissions && Object.keys(user.permissions).length) {
    return next();
  }

  const cached = await cacheGetOrSet(
    `permissions:${userId}`,
    env.PERMISSIONS_CACHE_TTL_MS,
    async () => {
      const dbUser = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          profile: { include: { permissions: true } }
        }
      });

      if (!dbUser) {
        throw new UnauthorizedError();
      }

      const profilePermissions = dbUser.profile?.permissions ?? [];
      const roleKey = dbUser.role as keyof typeof RolePermissionPresets;
      const basePermissions =
        profilePermissions.length > 0 ? profilePermissions : RolePermissionPresets[roleKey] ?? [];
      const permissionMap = buildPermissionMap(basePermissions);

      return { permissionMap };
    },
    { maxEntries: env.CACHE_MAX_ENTRIES }
  );

  user.permissions = cached.permissionMap;

  return next();
};
