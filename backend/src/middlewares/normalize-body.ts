import { NextFunction, Request, Response } from "express";

/**
 * Middleware para normalizar o body da requisição
 * Garante que todos os valores de string sejam strings primitivas
 */
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const normalizeValue = (value: unknown): unknown => {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === "string") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeValue(item));
  }

  if (isRecord(value)) {
    const normalized: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      normalized[key] = normalizeValue(entry);
    }
    return normalized;
  }

  return value;
};

export const normalizeBody = (request: Request, _response: Response, next: NextFunction) => {
  if (request.body && typeof request.body === "object") {
    request.body = normalizeValue(request.body) as Record<string, unknown>;
  }

  next();
};

