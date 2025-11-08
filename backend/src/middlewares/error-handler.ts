import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { MulterError } from "multer";

import { AppError } from "../utils/errors";
import { logger } from "../utils/logger";

export const errorHandler = (error: Error, request: Request, response: Response, _next: NextFunction) => {
  if (error instanceof ZodError) {
    logger.warn({ error: error.flatten() }, "Erro de validação");
    return response.status(422).json({ message: "Dados inválidos", issues: error.flatten() });
  }

  if (error instanceof AppError) {
    logger.warn({ error: error.details, message: error.message }, "Erro controlado");
    return response.status(error.statusCode).json({ message: error.message, details: error.details });
  }

  if (error instanceof MulterError) {
    logger.warn({ error: error.message }, "Erro ao processar upload");
    return response.status(400).json({ message: error.message });
  }

  logger.error({ error }, "Erro inesperado");
  return response.status(500).json({ message: "Erro interno" });
};
