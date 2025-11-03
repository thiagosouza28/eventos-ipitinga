import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { Secret, SignOptions } from "jsonwebtoken";

import { env } from "../../config/env";
import { prisma } from "../../lib/prisma";
import { UnauthorizedError } from "../../utils/errors";

export class AuthService {
  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new UnauthorizedError("Credenciais inválidas");
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedError("Credenciais inválidas");
    }

    const token = jwt.sign(
      {
        role: user.role,
        districtScopeId: user.districtScopeId,
        churchScopeId: user.churchScopeId
      },
      env.JWT_SECRET as Secret,
      {
        subject: user.id,
        expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"]
      }
    );

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        districtScopeId: user.districtScopeId,
        churchScopeId: user.churchScopeId
      }
    };
  }
}

export const authService = new AuthService();