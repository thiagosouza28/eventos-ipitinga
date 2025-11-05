import { Request, Response } from "express";
import { z } from "zod";

import { churchService } from "./church.service";

const createSchema = z.object({
  name: z.string().min(3),
  districtId: z.string().cuid(),
  directorName: z.string().min(1).optional(),
  directorCpf: z.string().optional(),
  directorBirthDate: z.string().datetime().optional(),
  directorEmail: z.string().email().optional(),
  directorWhatsapp: z.string().optional(),
  directorPhotoUrl: z.string().url().optional()
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
  // Garantir que os dados estão no formato correto
  const body = request.body;
  const cleanBody: Record<string, unknown> = {};
  
  // Extrair name
  if (typeof body.name === "string") {
    cleanBody.name = body.name.trim();
  } else if (body.name && typeof body.name === "object" && "value" in body.name) {
    cleanBody.name = String(body.name.value).trim();
  } else if (body.name !== undefined && body.name !== null) {
    cleanBody.name = String(body.name).trim();
  }
  
  // Extrair districtId
  if (typeof body.districtId === "string") {
    cleanBody.districtId = body.districtId.trim();
  } else if (body.districtId && typeof body.districtId === "object" && "value" in body.districtId) {
    cleanBody.districtId = String(body.districtId.value).trim();
  } else if (body.districtId !== undefined && body.districtId !== null) {
    cleanBody.districtId = String(body.districtId).trim();
  }
  
  // Extrair campos do diretor
  const directorFields = ['directorName', 'directorCpf', 'directorEmail', 'directorWhatsapp', 'directorPhotoUrl'];
  for (const field of directorFields) {
    if (body[field] !== undefined && body[field] !== null) {
      if (typeof body[field] === "string") {
        cleanBody[field] = body[field].trim() || undefined;
      } else if (body[field] && typeof body[field] === "object" && "value" in body[field]) {
        const value = String(body[field].value).trim();
        cleanBody[field] = value || undefined;
      } else {
        cleanBody[field] = String(body[field]).trim() || undefined;
      }
    }
  }
  
  // Extrair directorBirthDate
  if (body.directorBirthDate !== undefined && body.directorBirthDate !== null) {
    if (typeof body.directorBirthDate === "string") {
      cleanBody.directorBirthDate = body.directorBirthDate.trim() || undefined;
    } else if (body.directorBirthDate && typeof body.directorBirthDate === "object" && "value" in body.directorBirthDate) {
      cleanBody.directorBirthDate = String(body.directorBirthDate.value).trim() || undefined;
    } else {
      cleanBody.directorBirthDate = String(body.directorBirthDate).trim() || undefined;
    }
  }
  
  const payload = createSchema.parse(cleanBody);
  const church = await churchService.create(payload, request.user?.id);
  return response.status(201).json(church);
};

export const updateChurchHandler = async (request: Request, response: Response) => {
  // Garantir que os dados estão no formato correto
  const body = request.body;
  const cleanBody: Record<string, unknown> = {};
  
  // Extrair campos opcionais
  const fields = ['name', 'districtId', 'directorName', 'directorCpf', 'directorEmail', 'directorWhatsapp', 'directorPhotoUrl'];
  for (const field of fields) {
    if (body[field] !== undefined && body[field] !== null) {
      if (typeof body[field] === "string") {
        cleanBody[field] = body[field].trim() || undefined;
      } else if (body[field] && typeof body[field] === "object" && "value" in body[field]) {
        const value = String(body[field].value).trim();
        cleanBody[field] = value || undefined;
      } else {
        cleanBody[field] = String(body[field]).trim() || undefined;
      }
    }
  }
  
  // Extrair directorBirthDate
  if (body.directorBirthDate !== undefined && body.directorBirthDate !== null) {
    if (typeof body.directorBirthDate === "string") {
      cleanBody.directorBirthDate = body.directorBirthDate.trim() || undefined;
    } else if (body.directorBirthDate && typeof body.directorBirthDate === "object" && "value" in body.directorBirthDate) {
      cleanBody.directorBirthDate = String(body.directorBirthDate.value).trim() || undefined;
    } else {
      cleanBody.directorBirthDate = String(body.directorBirthDate).trim() || undefined;
    }
  }
  
  const payload = updateSchema.parse(cleanBody);
  const church = await churchService.update(request.params.id, payload, request.user?.id);
  return response.json(church);
};
