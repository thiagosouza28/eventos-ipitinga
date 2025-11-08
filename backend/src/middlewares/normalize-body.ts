import { NextFunction, Request, Response } from "express";

/**
 * Middleware para normalizar o body da requisição
 * Garante que todos os valores de string sejam strings primitivas
 */
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const normalizeBody = (request: Request, _response: Response, next: NextFunction) => {
  if (request.body && typeof request.body === "object") {
    const normalized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(request.body)) {
      if (value === null || value === undefined) {
        normalized[key] = value;
        continue;
      }

      if (typeof value === "string") {
        normalized[key] = String(value);
        continue;
      }

      if (Array.isArray(value)) {
        normalized[key] = value.map((item) => {
          if (typeof item === "string") {
            return String(item);
          }

          if (typeof item === "object" && item !== null && "value" in item) {
            return String((item as Record<string, unknown>).value);
          }

          return item;
        });
        continue;
      }

      if (isRecord(value)) {
        if (key in value && typeof value[key] === "string") {
          normalized[key] = String(value[key]);
        } else if ("value" in value && typeof value.value === "string") {
          normalized[key] = String(value.value);
        } else {
          const values = Object.values(value);
          const firstString = values.find((v: unknown) => typeof v === "string");
          if (firstString) {
            normalized[key] = String(firstString);
          } else {
            normalized[key] = String(value);
          }
        }
        continue;
      }

      normalized[key] = value;
    }

    request.body = normalized;
  }

  next();
};

