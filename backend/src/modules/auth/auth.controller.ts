import { Request, Response } from "express";
import { z } from "zod";

import { authService } from "./auth.service";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

export const loginHandler = async (request: Request, response: Response) => {
  const { email, password } = loginSchema.parse(request.body);
  const result = await authService.login(email, password);
  return response.json(result);
};
