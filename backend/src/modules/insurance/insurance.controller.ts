import type { Request, Response } from "express";
import { z } from "zod";

import { insuranceService } from "./insurance.service";

const querySchema = z.object({
  eventId: z.string().trim().optional(),
  search: z.string().trim().max(120).optional(),
  coverage: z.enum(["all", "insured", "waived"]).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional()
});

export const listInsuranceHandler = async (request: Request, response: Response) => {
  const filters = querySchema.parse(request.query);
  return response.json(await insuranceService.list(filters, request.user));
};
