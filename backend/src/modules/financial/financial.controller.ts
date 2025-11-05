import { Request, Response } from "express";
import { z } from "zod";
import { financialService } from "./financial.service";

const cuidOrUuid = z.string().uuid().or(z.string().cuid());

export const getEventSummaryHandler = async (request: Request, response: Response) => {
  try {
    const { eventId } = request.params;
    const summary = await financialService.getEventSummary(eventId);
    return response.json(summary);
  } catch (error: any) {
    console.error("Erro ao obter resumo do evento:", error);
    return response.status(500).json({
      message: "Erro ao obter resumo do evento",
      error: error.message
    });
  }
};

export const getDistrictSummaryHandler = async (request: Request, response: Response) => {
  const { eventId, districtId } = request.params;
  const summary = await financialService.getDistrictSummary(eventId, districtId);
  return response.json(summary);
};

export const getChurchSummaryHandler = async (request: Request, response: Response) => {
  const { eventId, churchId } = request.params;
  const summary = await financialService.getChurchSummary(eventId, churchId);
  return response.json(summary);
};

export const getGeneralSummaryHandler = async (request: Request, response: Response) => {
  try {
    const summary = await financialService.getGeneralSummary();
    return response.json(summary);
  } catch (error: any) {
    console.error("Erro ao obter resumo financeiro geral:", error);
    console.error("Stack trace:", error.stack);
    return response.status(500).json({
      message: "Erro ao obter resumo financeiro",
      error: error.message,
      code: error.code || "UNKNOWN_ERROR"
    });
  }
};

