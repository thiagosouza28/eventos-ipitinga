import { pipeline } from "stream/promises";
import { Request, Response } from "express";
import { z } from "zod";

import { registrationService } from "../registrations/registration.service";
import { sanitizeCpf } from "../../utils/mask";
import { env } from "../../config/env";
import { AppError, ForbiddenError, NotFoundError, UnauthorizedError } from "../../utils/errors";
import { logger } from "../../utils/logger";

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
  response.setHeader("Access-Control-Allow-Credentials", "true");
  response.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  response.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
  response.setHeader("Vary", "Origin");
};

const RECEIPT_ERROR_MESSAGE = "Comprovante nao encontrado ou token invalido.";
const RECEIPT_INTERNAL_MESSAGE = "Nao foi possivel gerar o comprovante agora.";

const sendReceiptError = (response: Response, status: number, message: string) =>
  response.status(status).json({ error: true, message });

const resolveReceiptError = (error: unknown) => {
  if (error instanceof UnauthorizedError || error instanceof ForbiddenError) {
    return { status: 401, message: RECEIPT_ERROR_MESSAGE };
  }
  if (error instanceof NotFoundError) {
    return { status: 404, message: RECEIPT_ERROR_MESSAGE };
  }
  if (error instanceof AppError) {
    if (error.statusCode === 401 || error.statusCode === 403) {
      return { status: 401, message: RECEIPT_ERROR_MESSAGE };
    }
    if (error.statusCode === 404) {
      return { status: 404, message: RECEIPT_ERROR_MESSAGE };
    }
    return { status: 500, message: RECEIPT_INTERNAL_MESSAGE };
  }
  return { status: 500, message: RECEIPT_INTERNAL_MESSAGE };
};

export const downloadReceiptHandler = async (request: Request, response: Response) => {
  const { registrationId } = request.params;
  const token = typeof request.query.token === "string" ? request.query.token : undefined;

  applyReceiptCors(request, response);

  if (request.method === "OPTIONS") {
    return response.sendStatus(204);
  }

  if (!registrationId) {
    return sendReceiptError(response, 404, RECEIPT_ERROR_MESSAGE);
  }

  if (!token) {
    return sendReceiptError(response, 401, RECEIPT_ERROR_MESSAGE);
  }

  try {
    const { stream, size } = await registrationService.streamReceipt(registrationId, token);
    response.setHeader("Content-Type", "application/pdf");
    response.setHeader("Content-Disposition", 'inline; filename="comprovante.pdf"');
    response.setHeader("Content-Length", String(size));
    await pipeline(stream, response);
    return;
  } catch (error) {
    const resolved = resolveReceiptError(error);
    if (resolved.status >= 500) {
      logger.error({ error, registrationId }, "Falha ao preparar download do recibo");
    } else {
      logger.warn({ error: (error as Error)?.message, registrationId }, "Falha ao validar recibo");
    }
    if (!response.headersSent) {
      return sendReceiptError(response, resolved.status, resolved.message);
    }
  }
};




