import type { NextFunction, Request, Response, RequestHandler } from "express";
import jwt, { JsonWebTokenError, NotBeforeError, TokenExpiredError } from "jsonwebtoken";

import { env } from "../config/env";
import type { Role } from "../config/roles";
import { UnauthorizedError } from "../utils/errors";
import { requestLogger } from "../utils/logger";
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

const TOKEN_PATTERN = /^Bearer\s+(.+)$/i;
const CLOCK_TOLERANCE_SECONDS = 30;

const logAuthFailure = (
  request: Request,
  code: string,
  message: string,
  extra?: Record<string, unknown>
) => {
  requestLogger.warn(
    {
      code,
      message,
      method: request.method,
      path: request.originalUrl,
      ...extra
    },
    "Auth failure"
  );
};

export const authenticate: RequestHandler = (request: Request, _response: Response, next: NextFunction) => {
  const headerValue = Array.isArray(request.headers.authorization)
    ? request.headers.authorization[0]
    : request.headers.authorization;
  if (!headerValue) {
    logAuthFailure(request, "TOKEN_MISSING", "Token ausente");
    throw new UnauthorizedError("Token ausente", { code: "TOKEN_MISSING" });
  }

  const match = headerValue.match(TOKEN_PATTERN);
  if (!match) {
    logAuthFailure(request, "TOKEN_MALFORMED", "Formato de token inválido");
    throw new UnauthorizedError("Formato de token inválido", { code: "TOKEN_MALFORMED" });
  }

  const token = match[1].trim();
  if (!token) {
    logAuthFailure(request, "TOKEN_MALFORMED", "Formato de token inválido");
    throw new UnauthorizedError("Formato de token inválido", { code: "TOKEN_MALFORMED" });
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, {
      clockTolerance: CLOCK_TOLERANCE_SECONDS
    }) as TokenPayload;
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
    if (error instanceof TokenExpiredError) {
      logAuthFailure(request, "TOKEN_EXPIRED", "Token expirado", {
        expiredAt: error.expiredAt?.toISOString()
      });
      throw new UnauthorizedError("Token expirado", { code: "TOKEN_EXPIRED" });
    }
    if (error instanceof JsonWebTokenError || error instanceof NotBeforeError) {
      logAuthFailure(request, "TOKEN_INVALID", "Token inválido", {
        error: error.message
      });
      throw new UnauthorizedError("Token inválido", { code: "TOKEN_INVALID" });
    }
    logAuthFailure(request, "TOKEN_INVALID", "Token inválido");
    throw new UnauthorizedError("Token inválido", { code: "TOKEN_INVALID" });
  }
};
