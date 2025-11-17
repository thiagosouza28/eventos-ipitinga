import { NextFunction, Request, Response, type RequestHandler } from "express";

import { RoleHierarchy } from "../config/roles";
import type { PermissionAction, PermissionModule } from "../config/permissions";
import { auditService } from "../services/audit.service";
import { ForbiddenError, UnauthorizedError } from "../utils/errors";
import { hasPermission } from "../utils/permissions";

export const authorize =
  (...roles: string[]): RequestHandler =>
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
  (module: PermissionModule | string, action: PermissionAction): RequestHandler =>
  async (request: Request, _response: Response, next: NextFunction) => {
    if (!request.user) {
      throw new UnauthorizedError();
    }
    if (!hasPermission(request.user.permissions, module, action)) {
      await auditService.log({
        actorUserId: request.user.id,
        action: "ACCESS_DENIED",
        entity: "permission",
        entityId: module,
        metadata: {
          attemptedAction: action,
          role: request.user.role,
          path: request.originalUrl
        }
      });
      throw new ForbiddenError("Acesso negado. Você não possui permissão para este módulo ou ação.");
    }
    return next();
  };
