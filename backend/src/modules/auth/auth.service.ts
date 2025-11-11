import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { Secret, SignOptions } from "jsonwebtoken";

import { env } from "../../config/env";
import { prisma } from "../../lib/prisma";
import { UnauthorizedError } from "../../utils/errors";

export class AuthService {
  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        ministries: {
          include: { ministry: true }
        }
      }
    });
    if (!user) {
      throw new UnauthorizedError("Credenciais invalidas");
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedError("Credenciais invalidas");
    }

    const ministryIds = user.ministries?.map((relation) => relation.ministryId) ?? [];

    const token = jwt.sign(
      {
        role: user.role,
        districtScopeId: user.districtScopeId,
        churchScopeId: user.churchScopeId,
        ministryIds
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
        churchScopeId: user.churchScopeId,
        cpf: user.cpf,
        phone: user.phone,
        mustChangePassword: user.mustChangePassword,
        ministries: user.ministries?.map((relation) => ({
          id: relation.ministryId,
          name: relation.ministry?.name ?? ""
        })) ?? []
      }
    };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedError();
    }

    const matches = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!matches) {
      throw new UnauthorizedError("Senha atual incorreta");
    }

    const passwordHash = await bcrypt.hash(newPassword, Number(env.PASSWORD_SALT_ROUNDS));
    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        mustChangePassword: false
      }
    });
  }
}

export const authService = new AuthService();
