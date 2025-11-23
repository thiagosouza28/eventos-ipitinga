import { Request, Response } from "express";
import { z } from "zod";

import { PermissionModules } from "../../config/permissions";
import { Roles } from "../../config/roles";
import { userService } from "./user.service";
import { userPermissionService } from "./user-permission.service";
import { normalizePermissionPayload } from "../../utils/permissions";

const photoSchema = z
  .union([z.string().min(10), z.literal(null), z.literal("")])
  .optional()
  .transform((value) => {
    if (value === "") return null;
    return value ?? undefined;
  });

const baseSchema = z.object({
  name: z.string().min(3),
  email: z.string().email(),
  cpf: z.string().optional().or(z.literal("")).transform((value) => value || undefined),
  phone: z.string().optional(),
  role: z.enum(Roles),
  districtScopeId: z.string().cuid().optional().or(z.literal("")).transform((value) => value || undefined),
  churchScopeId: z.string().cuid().optional().or(z.literal("")).transform((value) => value || undefined),
  profileId: z.string().cuid().optional().or(z.literal("")).transform((value) => value || undefined),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  ministryIds: z.array(z.string().cuid()).optional(),
  photoUrl: photoSchema
});

const createSchema = baseSchema;
const updateSchema = baseSchema.partial();
const statusSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE"])
});

const permissionEntrySchema = z.object({
  module: z.enum(PermissionModules),
  canView: z.boolean().optional(),
  canCreate: z.boolean().optional(),
  canEdit: z.boolean().optional(),
  canDelete: z.boolean().optional(),
  canApprove: z.boolean().optional(),
  canDeactivate: z.boolean().optional(),
  canReport: z.boolean().optional(),
  canFinancial: z.boolean().optional()
});

const userPermissionsSchema = z.object({
  permissions: z.array(permissionEntrySchema)
});

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

export const updateUserStatusHandler = async (request: Request, response: Response) => {
  const { status } = statusSchema.parse(request.body);
  const user = await userService.updateStatus(request.params.id, status, request.user?.id);
  return response.json(user);
};

export const deleteUserHandler = async (request: Request, response: Response) => {
  await userService.delete(request.params.id, request.user?.id);
  return response.status(204).send();
};

export const listUserPermissionsHandler = async (request: Request, response: Response) => {
  const permissions = await userPermissionService.list(request.params.id);
  return response.json(permissions);
};

export const updateUserPermissionsHandler = async (request: Request, response: Response) => {
  const { permissions } = userPermissionsSchema.parse(request.body);
  const normalized = permissions.map((entry) =>
    normalizePermissionPayload(entry.module, {
      view: entry.canView,
      create: entry.canCreate,
      edit: entry.canEdit,
      delete: entry.canDelete,
      approve: entry.canApprove,
      deactivate: entry.canDeactivate,
      reports: entry.canReport,
      financial: entry.canFinancial
    })
  );
  const result = await userPermissionService.upsert(request.params.id, normalized, request.user?.id);
  return response.json(result);
};
