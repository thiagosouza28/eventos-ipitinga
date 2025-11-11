import { Request, Response } from "express";
import { z } from "zod";

import { authService } from "./auth.service";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword: z.string().min(8)
});

export const loginHandler = async (request: Request, response: Response) => {
  const { email, password } = loginSchema.parse(request.body);
  const result = await authService.login(email, password);
  return response.json(result);
};

export const changePasswordHandler = async (request: Request, response: Response) => {
  const { currentPassword, newPassword } = changePasswordSchema.parse(request.body);
  if (!request.user) {
    throw new Error("Usuario nao autenticado");
  }
  await authService.changePassword(request.user.id, currentPassword, newPassword);
  return response.status(204).send();
};
