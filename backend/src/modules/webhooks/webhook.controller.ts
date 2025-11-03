import { Request, Response } from "express";

import { webhookService } from "./webhook.service";
import { env } from "../../config/env";
import { AppError } from "../../utils/errors";

export const mercadoPagoWebhookHandler = async (request: Request, response: Response) => {
  const secret = env.MP_WEBHOOK_SECRET;
  if (secret) {
    const headerSecret = request.headers["x-signature"] ?? request.headers["x-mp-signature"];
    if (headerSecret !== secret) {
      throw new AppError("Assinatura inválida", 401);
    }
  }

  const result = await webhookService.handleMercadoPago(
    request.body,
    request.headers["x-signature"] as string,
    request.query.topic as string
  );
  return response.json(result);
};
