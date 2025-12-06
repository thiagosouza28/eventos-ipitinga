import { Request, Response } from "express";
import { z } from "zod";

import { pixConfigService } from "./pix-config.service";

const upsertSchema = z.object({
  id: z.number().optional(),
  provider: z.string().min(2),
  clientId: z.string().optional(),
  clientSecret: z.string().optional(),
  apiKey: z.string().optional(),
  webhookUrl: z.string().url().optional(),
  certificatePath: z.string().optional(),
  active: z.boolean().optional()
});

export const getPixConfigHandler = async (_request: Request, response: Response) => {
  try {
    const config = (await pixConfigService.getActive()) ?? (await pixConfigService.getLatest());
    return response.json(config ?? null);
  } catch (error: any) {
    const status = error?.statusCode ?? 500;
    return response.status(status).json({
      message: error?.message ?? "Erro ao carregar configuração PIX. Rode as migrações e tente novamente."
    });
  }
};

export const upsertPixConfigHandler = async (request: Request, response: Response) => {
  const payload = upsertSchema.parse(request.body);
  const saved = await pixConfigService.upsert(payload);
  return response.json(saved);
};
