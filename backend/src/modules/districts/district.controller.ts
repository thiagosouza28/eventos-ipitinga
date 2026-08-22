import type { Request, Response } from "express";
import { z } from "zod";

import { AppError } from "../../utils/errors";
import { districtService } from "./district.service";

const createSchema = z.object({
  name: z.string().min(3),
  pastorName: z.string().min(1).optional()
});

const updateSchema = z.object({
  name: z.string().min(3).optional(),
  pastorName: z.string().min(1).optional().or(z.literal(""))
});

const resolveStringValue = (value: unknown) => {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const candidate = obj.value ?? obj.name ?? Object.values(obj)[0];
    if (candidate === undefined) return undefined;
    return String(candidate);
  }
  if (value === null || value === undefined) return undefined;
  return String(value);
};

const normalizeOptionalString = (value: unknown, label: string) => {
  if (value === null || value === undefined) return undefined;
  const resolved = resolveStringValue(value);
  if (resolved === undefined) {
    throw new AppError(`Campo '${label}' é inválido`, 400);
  }
  const trimmed = resolved.trim();
  if (trimmed === "[object Object]") {
    throw new AppError(`Campo '${label}' é inválido`, 400);
  }
  return trimmed;
};

const normalizeRequiredString = (value: unknown, label: string) => {
  const normalized = normalizeOptionalString(value, label);
  if (!normalized) {
    throw new AppError(`Campo '${label}' é obrigatório`, 400);
  }
  return normalized;
};

export const listDistrictsHandler = async (_request: Request, response: Response) => {
  const districts = await districtService.list();
  return response.json(districts);
};

export const createDistrictHandler = async (request: Request, response: Response) => {
  const body = request.body ?? {};

  const name = normalizeRequiredString(body.name, "name");
  const pastorNameRaw = normalizeOptionalString(body.pastorName, "pastorName");

  const cleanBody: { name: string; pastorName?: string } = { name };
  if (pastorNameRaw) {
    cleanBody.pastorName = pastorNameRaw;
  }

  const payload = createSchema.parse(cleanBody) as any;
  const district = await districtService.create(payload, request.user?.id);
  return response.status(201).json(district);
};

export const updateDistrictHandler = async (request: Request, response: Response) => {
  const body = request.body ?? {};
  const cleanBody: { name?: string; pastorName?: string } = {};

  if (body.name !== undefined) {
    cleanBody.name = normalizeRequiredString(body.name, "name");
  }

  if (body.pastorName !== undefined) {
    const pastorName = normalizeOptionalString(body.pastorName, "pastorName");
    if (pastorName !== undefined) {
      cleanBody.pastorName = pastorName;
    }
  }

  const payload = updateSchema.parse(cleanBody);
  const district = await districtService.update(request.params.id, payload, request.user?.id);
  return response.json(district);
};

export const deleteDistrictHandler = async (request: Request, response: Response) => {
  await districtService.delete(request.params.id, request.user?.id);
  return response.status(204).send();
};
