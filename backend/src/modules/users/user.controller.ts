import type { Request, Response } from "express";
import { z } from "zod";

import { Roles } from "../../config/roles";
import { userService } from "./user.service";

const photoSchema = z
  .union([z.string().min(10), z.null(), z.literal("")])
  .optional()
  .transform((value) => {
    if (value === "") return null;
    return value ?? undefined;
  });

const cuidOrUuid = z.string().cuid().or(z.string().uuid());
const optionalId = z
  .union([cuidOrUuid, z.literal(""), z.null()])
  .optional()
  .transform((value) => value === "" ? null : value);
const optionalText = z
  .union([z.string(), z.null()])
  .optional()
  .transform((value) => value === "" ? null : value);

const baseSchema = z.object({
  name: z.string().min(3),
  email: z.string().email(),
  cpf: optionalText,
  phone: optionalText,
  role: z.enum(Roles),
  districtScopeId: optionalId,
  churchScopeId: optionalId,
  profileId: optionalId,
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  ministryIds: z.array(cuidOrUuid).nullish().transform((value) => value === null ? [] : value),
  photoUrl: photoSchema,
  pixType: z.enum(["CPF", "CNPJ", "EMAIL", "PHONE", "RANDOM", "EVP"]).optional(),
  pixKey: optionalText,
  pixOwnerName: optionalText,
  pixOwnerDocument: optionalText,
  pixBankName: optionalText,
  pixStatus: z.enum(["VALIDATED", "PENDING"]).optional()
});

const createSchema = baseSchema;
const updateSchema = baseSchema.partial();
const statusSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE"])
});

export const listUsersHandler = async (_request: Request, response: Response) => {
  const users = await userService.list();
  return response.json(users);
};

export const createUserHandler = async (request: Request, response: Response) => {
  const payload = createSchema.parse(request.body) as any;
  const result = await userService.create(payload, request.user);
  return response.status(201).json(result);
};

export const updateUserHandler = async (request: Request, response: Response) => {
  const payload = updateSchema.parse(request.body) as any;
  const user = await userService.update(request.params.id, payload, request.user);
  return response.json(user);
};

export const resetUserPasswordHandler = async (request: Request, response: Response) => {
  const result = await userService.resetPassword(request.params.id, request.user?.id);
  return response.json(result);
};

export const updateUserStatusHandler = async (request: Request, response: Response) => {
  const { status } = statusSchema.parse(request.body) as any;
  const user = await userService.updateStatus(request.params.id, status, request.user?.id);
  return response.json(user);
};

export const deleteUserHandler = async (request: Request, response: Response) => {
  await userService.delete(request.params.id, request.user?.id);
  return response.status(204).send();
};
