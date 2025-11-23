import { NextFunction, Request, Response, type RequestHandler } from "express";
import jwt from "jsonwebtoken";

import { env } from "../config/env";
import type { Role } from "../config/roles";
import { UnauthorizedError } from "../utils/errors";
import type { PermissionMap } from "../utils/permissions";

type TokenPayload = {
  sub: string;
  role: Role;
  districtScopeId?: string | null;
  churchId?: string | null;
  ministryId?: string | null;
  ministryIds?: string[];
  profileId?: string | null;
  permissions?: PermissionMap;
  mustChangePassword?: boolean;
};

export const authenticate: RequestHandler = (request: Request, _response: Response, next: NextFunction) => {
  const authHeader = request.headers.authorization;
  if (!authHeader) {
    throw new UnauthorizedError();
  }

  const [, token] = authHeader.split(" ");
  if (!token) {
    throw new UnauthorizedError();
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as TokenPayload;
    request.user = {
      id: decoded.sub,
      role: decoded.role,
      districtScopeId: decoded.districtScopeId,
      churchId: decoded.churchId,
      ministryId: decoded.ministryId,
      ministryIds: decoded.ministryIds ?? [],
      profileId: decoded.profileId,
      permissions: decoded.permissions,
      mustChangePassword: decoded.mustChangePassword
    };
    return next();
  } catch (error) {
    throw new UnauthorizedError();
  }
};
