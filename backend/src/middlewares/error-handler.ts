import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { MulterError } from "multer";
import { Prisma } from "@prisma/client";

import { AppError } from "../utils/errors";
import { logger } from "../utils/logger";

const resolveUniqueConstraintMessage = (target: unknown) => {
  const constraint = Array.isArray(target) ? target.join(",") : String(target ?? "");
  switch (constraint) {
    case "Registration_eventId_cpf_key":
      return "Este CPF já possui inscrição ativa para este evento.";
    case "User_email_key":
      return "Já existe um usuário com este e-mail.";
    case "District_name_key":
      return "Já existe um distrito com este nome.";
    case "Church_name_districtId_key":
      return "Já existe uma igreja com este nome neste distrito.";
    default:
      return "Registro duplicado. Ajuste os dados e tente novamente.";
  }
};

export const errorHandler = (error: Error, request: Request, response: Response, _next: NextFunction) => {
  if (error instanceof ZodError) {
    logger.warn({ error: error.flatten() }, "Erro de validação");
    const firstIssue = error.issues[0];
    const field = firstIssue?.path.length ? firstIssue.path.join(".") : null;
    const message = field
      ? `Dados invalidos no campo ${field}: ${firstIssue.message}`
      : `Dados invalidos: ${firstIssue?.message ?? "revise os campos informados"}`;
    return response.status(422).json({ message, issues: error.flatten() });
  }

  if (error instanceof AppError) {
    logger.warn({ error: error.details, message: error.message }, "Erro controlado");
    return response.status(error.statusCode).json({ message: error.message, details: error.details });
  }

  if (error instanceof MulterError) {
    logger.warn({ error: error.message }, "Erro ao processar upload");
    return response.status(400).json({ message: error.message });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      const message = resolveUniqueConstraintMessage(error.meta?.target);
      logger.warn({ code: error.code, target: error.meta?.target }, "Violacao de unicidade no banco");
      return response.status(409).json({ message });
    }
  }

  logger.error({ error }, "Erro inesperado");
  return response.status(500).json({ message: "Erro interno" });
};
