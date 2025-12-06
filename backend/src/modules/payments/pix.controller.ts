import { Request, Response } from "express";
import { z } from "zod";

import { pixPaymentService } from "./pix.service";
import { mercadoPagoWebhookHandler } from "../webhooks/webhook.controller";

const createPixPaymentSchema = z.object({
  orderId: z.string().min(8)
});

export const createPixPaymentHandler = async (request: Request, response: Response) => {
  const { orderId } = createPixPaymentSchema.parse(request.body);
  const result = await pixPaymentService.createCharge(orderId);
  return response.json(result);
};

export const unifiedPixWebhookHandler = async (request: Request, response: Response) => {
  const detectedProvider = pixPaymentService.detectProvider(request.body, request.headers, request.query);
  if (detectedProvider === "mercadopago") {
    return mercadoPagoWebhookHandler(request, response);
  }

  const result = await pixPaymentService.handleWebhook(
    request.body,
    detectedProvider,
    request.headers,
    request.query
  );
  return response.json(result);
};
