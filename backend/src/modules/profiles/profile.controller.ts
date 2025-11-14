import { Request, Response } from "express";
import { z } from "zod";

import { profileService } from "./profile.service";

const permissionSchema = z.object({
  module: z.string().min(3),
  canView: z.boolean().optional().default(false),
  canCreate: z.boolean().optional().default(false),
  canEdit: z.boolean().optional().default(false),
  canDelete: z.boolean().optional().default(false),
  canApprove: z.boolean().optional().default(false),
  canDeactivate: z.boolean().optional().default(false),
  canReport: z.boolean().optional().default(false),
  canFinancial: z.boolean().optional().default(false)
});

const baseSchema = z.object({
  name: z.string().min(3),
  description: z
    .string()
    .max(255)
    .optional()
    .or(z.literal(""))
    .transform((value) => (value ? value.trim() : null)),
  isActive: z.boolean().optional(),
  permissions: z.array(permissionSchema).default([])
});

const createSchema = baseSchema;
const updateSchema = baseSchema.partial();

const statusSchema = z.object({
  isActive: z.boolean()
});

export const listProfilesHandler = async (_request: Request, response: Response) => {
  const profiles = await profileService.list();
  return response.json(profiles);
};

export const createProfileHandler = async (request: Request, response: Response) => {
  const payload = createSchema.parse(request.body);
  const profile = await profileService.create(payload);
  return response.status(201).json(profile);
};

export const updateProfileHandler = async (request: Request, response: Response) => {
  const payload = updateSchema.parse(request.body);
  const profile = await profileService.update(request.params.id, payload);
  return response.json(profile);
};

export const updateProfileStatusHandler = async (request: Request, response: Response) => {
  const { isActive } = statusSchema.parse(request.body);
  const profile = await profileService.setStatus(request.params.id, isActive);
  return response.json(profile);
};

export const deleteProfileHandler = async (request: Request, response: Response) => {
  await profileService.delete(request.params.id);
  return response.status(204).send();
};
