import { Request, Response } from "express";
import { z } from "zod";
import { financialService } from "./financial.service";
import { generateFinancialEventReportPdf } from "../../pdf/financial-report.service";
import { ensureEventMinistryAccess } from "../../utils/ministry-access";
import { getScopedMinistryIds } from "../../utils/user-scope";

const cuidOrUuid = z.string().uuid().or(z.string().cuid());

export const getEventSummaryHandler = async (request: Request, response: Response) => {
  try {
    const { eventId } = request.params;
    const ministryIds = getScopedMinistryIds(request.user);
    await ensureEventMinistryAccess(eventId, ministryIds);
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
  try {
    const { eventId, districtId } = request.params;
    const ministryIds = getScopedMinistryIds(request.user);
    await ensureEventMinistryAccess(eventId, ministryIds);
    const summary = await financialService.getDistrictSummary(eventId, districtId);
    return response.json(summary);
  } catch (error: any) {
    console.error("Erro ao obter resumo do distrito:", error);
    return response.status(error.statusCode ?? 500).json({
      message: error.message ?? "Erro ao obter dados do distrito"
    });
  }
};

export const getChurchSummaryHandler = async (request: Request, response: Response) => {
  try {
    const { eventId, churchId } = request.params;
    const ministryIds = getScopedMinistryIds(request.user);
    await ensureEventMinistryAccess(eventId, ministryIds);
    const summary = await financialService.getChurchSummary(eventId, churchId);
    return response.json(summary);
  } catch (error: any) {
    console.error("Erro ao obter resumo da igreja:", error);
    return response.status(error.statusCode ?? 500).json({
      message: error.message ?? "Erro ao obter dados da igreja"
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
    return response.status(500).json({
      message: "Erro ao obter resumo financeiro",
      error: error.message,
      code: error.code || "UNKNOWN_ERROR"
    });
  }
};

export const downloadEventFinancialReportHandler = async (request: Request, response: Response) => {
  try {
    const { eventId } = request.params;
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
    console.error("Erro ao gerar relatório financeiro em PDF:", error);
    return response.status(500).json({
      message: "Erro ao gerar relatório financeiro",
      error: error.message
    });
  }
};

