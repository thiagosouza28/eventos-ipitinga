import { NextFunction, Request, Response } from "express";

import { RoleHierarchy } from "../config/roles";
import { ForbiddenError, UnauthorizedError } from "../utils/errors";

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
