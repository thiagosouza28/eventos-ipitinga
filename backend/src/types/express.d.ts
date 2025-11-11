import type { Role } from "../config/roles";

declare global {
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    interface User {
      id: string;
      role: Role;
      districtScopeId?: string | null;
      churchScopeId?: string | null;
      ministryIds?: string[];
    }

    interface Request {
      user?: User;
    }
  }
}

export {};
