import type { Request } from "express";

import type { Role } from "../config/roles";

type MaybeUser = Request["user"];

const rolesWithoutMinistryScope: Role[] = ["AdminGeral"];

export const getScopedMinistryIds = (user?: MaybeUser) => {
  if (!user) {
    return undefined;
  }
  if (rolesWithoutMinistryScope.includes(user.role)) {
    return undefined;
  }
  const ids = user.ministryIds ?? [];
  return ids.length ? ids : undefined;
};
