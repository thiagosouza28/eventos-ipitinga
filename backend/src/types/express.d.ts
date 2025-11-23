import type { Role } from "../config/roles";
import type { PermissionMap } from "../utils/permissions";

declare global {
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    interface User {
      id: string;
      role: Role;
      districtScopeId?: string | null;
      churchId?: string | null;
      ministryId?: string | null;
      ministryIds?: string[];
      profileId?: string | null;
      permissions?: PermissionMap;
      mustChangePassword?: boolean;
    }

    interface Request {
      user?: User;
    }
  }
}

export {};
