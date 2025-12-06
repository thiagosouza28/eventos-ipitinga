import { Request, Response } from "express";

import { financialService } from "./financial.service";
import { generateFinancialEventReportPdf } from "../../pdf/financial-report.service";
import { ensureEventMinistryAccess } from "../../utils/ministry-access";
import { getScopedMinistryIds } from "../../utils/user-scope";
import { z } from "zod";

const eventIdSchema = z.string().min(6, "eventId invalido");

export const getEventSummaryHandler = async (request: Request, response: Response) => {
  try {
    const eventId = eventIdSchema.parse(request.params.eventId);
    const ministryIds = getScopedMinistryIds(request.user);
    await ensureEventMinistryAccess(eventId, ministryIds);
    const summary = await financialService.getEventSummary(eventId);
    return response.json(summary);
  } catch (error: any) {
    console.error("Erro ao obter resumo do evento:", error);
    const status = error?.statusCode ?? 500;
    return response.status(status).json({
      message: error?.message ?? "Erro ao obter resumo do evento",
      details: error?.details
    });
  }
};

export const getDistrictSummaryHandler = async (request: Request, response: Response) => {
  try {
    const eventId = eventIdSchema.parse(request.params.eventId);
    const { districtId } = request.params;
    const ministryIds = getScopedMinistryIds(request.user);
    await ensureEventMinistryAccess(eventId, ministryIds);
    const summary = await financialService.getDistrictSummary(eventId, districtId);
    return response.json(summary);
  } catch (error: any) {
    console.error("Erro ao obter resumo do distrito:", error);
    const status = error?.statusCode ?? 500;
    return response.status(status).json({
      message: error?.message ?? "Erro ao obter dados do distrito",
      details: error?.details
    });
  }
};

export const getChurchSummaryHandler = async (request: Request, response: Response) => {
  try {
    const eventId = eventIdSchema.parse(request.params.eventId);
    const { churchId } = request.params;
    const ministryIds = getScopedMinistryIds(request.user);
    await ensureEventMinistryAccess(eventId, ministryIds);
    const summary = await financialService.getChurchSummary(eventId, churchId);
    return response.json(summary);
  } catch (error: any) {
    console.error("Erro ao obter resumo da igreja:", error);
    const status = error?.statusCode ?? 500;
    return response.status(status).json({
      message: error?.message ?? "Erro ao obter dados da igreja",
      details: error?.details
    });
  }
};

export const getGeneralSummaryHandler = async (request: Request, response: Response) => {
  try {
    const summary = await financialService.getGeneralSummary();
    return response.json(summary);
  } catch (error: any) {
    console.error("Erro ao obter resumo financeiro geral:", error);
    console.error("Stack trace:", error.stack);
    const status = error?.statusCode ?? 500;
    return response.status(status).json({
      message: error?.message ?? "Erro ao obter resumo financeiro",
      error: error?.message,
      code: error?.code || "UNKNOWN_ERROR",
      details: error?.details
    });
  }
};

export const downloadEventFinancialReportHandler = async (
  request: Request,
  response: Response
) => {
  try {
    const eventId = eventIdSchema.parse(request.params.eventId);
    const ministryIds = getScopedMinistryIds(request.user);
    await ensureEventMinistryAccess(eventId, ministryIds);
    const reportData = await financialService.getEventFinancialReportData(eventId);
    const generatedAt = new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(new Date());

    const pdfBuffer = await generateFinancialEventReportPdf({
      generatedAt,
      event: reportData.event,
      totals: reportData.totals,
      paidOrdersCount: reportData.paidOrdersCount,
      paidRegistrationsCount: reportData.paidRegistrationsCount,
      expenses: reportData.expenses
    });

    response.setHeader("Content-Type", "application/pdf");
    response.setHeader(
      "Content-Disposition",
      `attachment; filename="relatorio-financeiro-${reportData.event.slug ?? reportData.event.id}.pdf"`
    );
    return response.send(pdfBuffer);
  } catch (error: any) {
    console.error("Erro ao gerar relatИrio financeiro em PDF:", error);
    const status = error?.statusCode ?? 500;
    return response.status(status).json({
      message: error?.message ?? "Erro ao gerar relatИrio financeiro",
      error: error?.message,
      details: error?.details
    });
  }
};
