import { Request, Response } from "express";
import { z } from "zod";

import { Roles } from "../../config/roles";
import { userService } from "./user.service";

const baseSchema = z.object({
  name: z.string().min(3),
  email: z.string().email(),
  cpf: z.string().optional().or(z.literal("")).transform((value) => value || undefined),
  phone: z.string().optional(),
  role: z.enum(Roles),
  districtScopeId: z.string().cuid().optional().or(z.literal("")).transform((value) => value || undefined),
  churchScopeId: z.string().cuid().optional().or(z.literal("")).transform((value) => value || undefined),
  ministryIds: z.array(z.string().cuid()).optional()
});

const createSchema = baseSchema;
const updateSchema = baseSchema.partial();

export const listUsersHandler = async (_request: Request, response: Response) => {
  const users = await userService.list();
  return response.json(users);
};

export const createUserHandler = async (request: Request, response: Response) => {
  const payload = createSchema.parse(request.body);
  const result = await userService.create(payload, request.user?.id);
  return response.status(201).json(result);
};

export const updateUserHandler = async (request: Request, response: Response) => {
  const payload = updateSchema.parse(request.body);
  const user = await userService.update(request.params.id, payload, request.user?.id);
  return response.json(user);
};

export const resetUserPasswordHandler = async (request: Request, response: Response) => {
  const result = await userService.resetPassword(request.params.id, request.user?.id);
  return response.json(result);
};
