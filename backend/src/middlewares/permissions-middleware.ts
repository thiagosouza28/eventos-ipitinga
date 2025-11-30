import { NextFunction, Request, Response } from "express";

import { prisma } from "../lib/prisma";
import { RolePermissionPresets } from "../config/permissions";
import { buildPermissionMap } from "../utils/permissions";
import { UnauthorizedError } from "../utils/errors";

export const hydratePermissions = async (request: Request, _response: Response, next: NextFunction) => {
  if (!request.user) {
    throw new UnauthorizedError();
  }

  // Se já houver mapa no token, aproveitamos para evitar consultas desnecessárias
  if (request.user.permissions && Object.keys(request.user.permissions).length) {
    return next();
  }

  const user = await prisma.user.findUnique({
    where: { id: request.user.id },
    include: {
      profile: { include: { permissions: true } }
    }
  });

  if (!user) {
    throw new UnauthorizedError();
  }

  const profilePermissions = user.profile?.permissions ?? [];
  const roleKey = user.role as keyof typeof RolePermissionPresets;
  const basePermissions =
    profilePermissions.length > 0 ? profilePermissions : RolePermissionPresets[roleKey] ?? [];
  const permissionMap = buildPermissionMap(basePermissions);

  request.user.permissions = permissionMap;

  return next();
};
