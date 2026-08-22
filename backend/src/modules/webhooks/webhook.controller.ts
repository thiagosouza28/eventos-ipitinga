import type { Request, Response } from "express";
import { WebhookSignatureValidator } from "mercadopago";

import { webhookService } from "./webhook.service";
import { env } from "../../config/env";
import { AppError } from "../../utils/errors";

export const mercadoPagoWebhookHandler = async (request: Request, response: Response) => {
  const secret = env.MP_WEBHOOK_SECRET;
  if (secret) {
    const rawDataId = request.query["data.id"];
    const dataId =
      typeof rawDataId === "string"
        ? rawDataId
        : Array.isArray(rawDataId)
          ? rawDataId.filter((value): value is string => typeof value === "string")
          : undefined;
    try {
      WebhookSignatureValidator.validate({
        xSignature: request.headers["x-signature"],
        xRequestId: request.headers["x-request-id"],
        dataId,
        secret
      });
    } catch {
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
