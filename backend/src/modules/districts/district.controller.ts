import { Request, Response } from "express";
import { z } from "zod";

import { districtService } from "./district.service";

const createSchema = z.object({
  name: z.string().min(3)
});

export const listDistrictsHandler = async (_request: Request, response: Response) => {
  const districts = await districtService.list();
  return response.json(districts);
};

export const createDistrictHandler = async (request: Request, response: Response) => {
  const payload = createSchema.parse(request.body);
  const district = await districtService.create(payload.name, request.user?.id);
  return response.status(201).json(district);
};

export const updateDistrictHandler = async (request: Request, response: Response) => {
  const payload = createSchema.parse(request.body);
  const district = await districtService.update(request.params.id, payload.name, request.user?.id);
  return response.json(district);
};
