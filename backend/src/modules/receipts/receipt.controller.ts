import { Request, Response } from "express";
import { z } from "zod";

import { registrationService } from "../registrations/registration.service";
import { sanitizeCpf } from "../../utils/mask";
import { env } from "../../config/env";

const lookupSchema = z.object({
  cpf: z.string().min(11),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
});

export const lookupReceiptsHandler = async (request: Request, response: Response) => {
  const payload = lookupSchema.parse(request.body);
  const receipts = await registrationService.lookupReceipts(
    sanitizeCpf(payload.cpf),
    payload.birthDate
  );
  return response.json(receipts);
};

const applyReceiptCors = (request: Request, response: Response) => {
  const origin = request.headers.origin;
  const allowedOrigins = env.corsOrigins ?? [];
  const resolvedOrigin =
    origin && allowedOrigins.includes(origin)
      ? origin
      : allowedOrigins.includes("*")
        ? "*"
        : origin ?? "*";
  response.setHeader("Access-Control-Allow-Origin", resolvedOrigin);
  response.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  response.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
  response.setHeader("Vary", "Origin");
};

export const downloadReceiptHandler = async (request: Request, response: Response) => {
  const { registrationId } = request.params;
  const { token } = request.query;

  applyReceiptCors(request, response);

  if (request.method === "OPTIONS") {
    return response.sendStatus(204);
  }

  if (typeof token !== "string") {
    return response.status(400).json({ message: "Token obrigatorio" });
  }

  const buffer = await registrationService.streamReceipt(registrationId, token);
  response.setHeader("Content-Type", "application/pdf");
  response.setHeader(
    "Content-Disposition",
    `inline; filename=recibo-${registrationId}.pdf`
  );
  return response.send(buffer);
};
