import { NextFunction, Request, Response } from "express";

import { requestScope } from "../lib/request-scope";

const rolesWithoutScope = new Set(["AdminGeral"]);

export const applyScope = (request: Request, _response: Response, next: NextFunction) => {
  if (!request.user) {
    return next();
  }

  const shouldSkipScope = rolesWithoutScope.has(request.user.role);

  const scope = shouldSkipScope
    ? {
        userId: request.user.id,
        ministryId: null,
        churchId: null
      }
    : {
        userId: request.user.id,
        ministryId: request.user.ministryId ?? request.user.ministryIds?.[0] ?? null,
        churchId: request.user.churchId ?? null
      };

  return requestScope.run(scope, () => next());
};
