import { Request, Response } from "express";
import { z } from "zod";

import { churchService } from "./church.service";

const createSchema = z.object({
  name: z.string().min(3),
  districtId: z.string().cuid()
});

const updateSchema = createSchema.partial();

export const listChurchesHandler = async (request: Request, response: Response) => {
  const { districtId } = request.query;
  const churches = await churchService.list(
    typeof districtId === "string" ? districtId : undefined
  );
  return response.json(churches);
};

export const createChurchHandler = async (request: Request, response: Response) => {
  const payload = createSchema.parse(request.body);
  const church = await churchService.create(payload, request.user?.id);
  return response.status(201).json(church);
};

export const updateChurchHandler = async (request: Request, response: Response) => {
  const payload = updateSchema.parse(request.body);
  const church = await churchService.update(request.params.id, payload, request.user?.id);
  return response.json(church);
};
