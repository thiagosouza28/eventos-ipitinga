import { NextFunction, Request, Response } from "express";

import { RoleHierarchy } from "../config/roles";
import type { PermissionAction, PermissionModule } from "../config/permissions";
import { ForbiddenError, UnauthorizedError } from "../utils/errors";
import { hasPermission } from "../utils/permissions";

export const authorize =
  (...roles: string[]) =>
  (request: Request, _response: Response, next: NextFunction) => {
    if (!request.user) {
      throw new UnauthorizedError();
    }
    const allowedRoles = new Set<string>();
    roles.forEach((role) => {
      RoleHierarchy[role as keyof typeof RoleHierarchy]?.forEach((r) => allowedRoles.add(r));
    });

    if (!allowedRoles.has(request.user.role)) {
      throw new ForbiddenError();
    }

    return next();
  };

export const authorizePermission =
  (module: PermissionModule | string, action: PermissionAction) =>
  (request: Request, _response: Response, next: NextFunction) => {
    if (!request.user) {
      throw new UnauthorizedError();
    }
    if (!hasPermission(request.user.permissions, module, action)) {
      throw new ForbiddenError();
    }
    return next();
  };
