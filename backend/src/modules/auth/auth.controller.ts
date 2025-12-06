import { Request, Response } from "express";
import { z } from "zod";

import { authService } from "./auth.service";
import { UnauthorizedError } from "../../utils/errors";

const loginSchema = z.object({
  identifier: z.string().min(3),
  password: z.string().min(6)
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword: z.string().min(8)
});

const recoverPasswordSchema = z.object({
  identifier: z.string().min(3)
});

export const loginHandler = async (request: Request, response: Response) => {
  const { identifier, password } = loginSchema.parse(request.body);
  const result = await authService.login(identifier, password);
  return response.json(result);
};

export const changePasswordHandler = async (request: Request, response: Response) => {
  const { currentPassword, newPassword } = changePasswordSchema.parse(request.body);
  if (!request.user) {
    throw new Error("Usuario nao autenticado");
  }
  const result = await authService.changePassword(request.user.id, currentPassword, newPassword);
  return response.json(result);
};

export const recoverPasswordHandler = async (request: Request, response: Response) => {
  const { identifier } = recoverPasswordSchema.parse(request.body);
  await authService.requestPasswordReset(identifier);
  return response.status(204).send();
};

export const getProfileHandler = async (request: Request, response: Response) => {
  if (!request.user) {
    throw new UnauthorizedError("Usuario nao autenticado");
  }
  const session = await authService.getSession(request.user.id);
  return response.json(session);
};
