import { Request, Response } from "express";
import { z } from "zod";

import { ministryService } from "./ministry.service";

const createSchema = z.object({
  name: z.string().min(3),
  description: z.string().max(500).optional(),
  isActive: z.boolean().optional()
});

const updateSchema = createSchema.partial();

export const listMinistriesHandler = async (request: Request, response: Response) => {
  const includeInactive = request.query.includeInactive !== "false";
  const ministries = await ministryService.list(includeInactive);
  return response.json(ministries);
};

export const createMinistryHandler = async (request: Request, response: Response) => {
  const payload = createSchema.parse(request.body);
  const ministry = await ministryService.create(payload, request.user?.id);
  return response.status(201).json(ministry);
};

export const updateMinistryHandler = async (request: Request, response: Response) => {
  const payload = updateSchema.parse(request.body);
  const ministry = await ministryService.update(request.params.id, payload, request.user?.id);
  return response.json(ministry);
};

export const deleteMinistryHandler = async (request: Request, response: Response) => {
  await ministryService.delete(request.params.id, request.user?.id);
  return response.status(204).send();
};
