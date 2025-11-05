import { Request, Response } from "express";
import { z } from "zod";

import { districtService } from "./district.service";

const createSchema = z.object({
  name: z.string().min(3),
  pastorName: z.string().min(1).optional()
});

const updateSchema = z.object({
  name: z.string().min(3).optional(),
  pastorName: z.string().min(1).optional().or(z.literal(""))
});

export const listDistrictsHandler = async (_request: Request, response: Response) => {
  const districts = await districtService.list();
  return response.json(districts);
};

export const createDistrictHandler = async (request: Request, response: Response) => {
  // Extrair apenas os valores dos campos, não objetos
  const body = request.body;
  
  console.log('[DEBUG] createDistrictHandler - body recebido:', JSON.stringify(body, null, 2));
  
  // Extrair name - se for objeto, pegar apenas o valor
  let name: string;
  if (typeof body.name === "string") {
    name = body.name.trim();
  } else if (body.name && typeof body.name === "object") {
    // Se for objeto, extrair apenas o valor do campo "name"
    if ("name" in body.name && typeof body.name.name === "string") {
      name = body.name.name.trim();
    } else if ("value" in body.name) {
      name = String(body.name.value).trim();
    } else {
      // Se o objeto tem propriedade "name", usar ela
      const nameValue = body.name.name || body.name.value || Object.values(body.name)[0];
      name = String(nameValue).trim();
    }
  } else if (body.name === null || body.name === undefined) {
    throw new Error("Campo 'name' é obrigatório");
  } else {
    name = String(body.name).trim();
  }
  
  // Garantir que name seja uma string válida
  if (!name || name === "[object Object]" || name.length === 0) {
    throw new Error("Campo 'name' deve ser uma string válida");
  }
  
  // Extrair pastorName - se for objeto, pegar apenas o valor
  let pastorName: string | undefined;
  if (typeof body.pastorName === "string") {
    pastorName = body.pastorName.trim() || undefined;
  } else if (body.pastorName && typeof body.pastorName === "object") {
    // Se for objeto, extrair apenas o valor do campo "pastorName"
    if ("pastorName" in body.pastorName && typeof body.pastorName.pastorName === "string") {
      pastorName = body.pastorName.pastorName.trim() || undefined;
    } else if ("value" in body.pastorName) {
      pastorName = String(body.pastorName.value).trim() || undefined;
    } else {
      const pastorValue = body.pastorName.pastorName || body.pastorName.value || Object.values(body.pastorName)[0];
      pastorName = pastorValue ? String(pastorValue).trim() : undefined;
    }
  } else if (body.pastorName !== undefined && body.pastorName !== null) {
    const converted = String(body.pastorName).trim();
    if (converted !== "[object Object]") {
      pastorName = converted || undefined;
    }
  }
  
  // Criar payload com apenas os valores
  const cleanBody: { name: string; pastorName?: string } = { name };
  if (pastorName) {
    cleanBody.pastorName = pastorName;
  }
  
  console.log('[DEBUG] createDistrictHandler - cleanBody (apenas valores):', JSON.stringify(cleanBody, null, 2));
  
  const payload = createSchema.parse(cleanBody);
  const district = await districtService.create(payload, request.user?.id);
  return response.status(201).json(district);
};

export const updateDistrictHandler = async (request: Request, response: Response) => {
  // Garantir que os dados estão no formato correto
  const body = request.body;
  const cleanBody: { name?: string; pastorName?: string } = {};
  
  // Extrair name se presente
  if (body.name !== undefined && body.name !== null) {
    if (typeof body.name === "string") {
      cleanBody.name = body.name.trim();
    } else if (body.name && typeof body.name === "object" && "value" in body.name) {
      cleanBody.name = String(body.name.value).trim();
    } else {
      cleanBody.name = String(body.name).trim();
    }
  }
  
  // Extrair pastorName se presente
  if (body.pastorName !== undefined && body.pastorName !== null) {
    if (typeof body.pastorName === "string") {
      const value = body.pastorName.trim();
      cleanBody.pastorName = value || undefined;
    } else if (body.pastorName && typeof body.pastorName === "object" && "value" in body.pastorName) {
      const value = String(body.pastorName.value).trim();
      cleanBody.pastorName = value || undefined;
    } else {
      const value = String(body.pastorName).trim();
      cleanBody.pastorName = value || undefined;
    }
  }
  
  const payload = updateSchema.parse(cleanBody);
  const district = await districtService.update(request.params.id, payload, request.user?.id);
  return response.json(district);
};
