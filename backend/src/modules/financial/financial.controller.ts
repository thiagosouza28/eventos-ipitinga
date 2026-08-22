import type { Request, Response } from "express";

import { financialService } from "./financial.service";
import { generateFinancialEventReportPdf } from "../../pdf/financial-report.service";
import { ensureEventMinistryAccess } from "../../utils/ministry-access";
import { getScopedMinistryIds } from "../../utils/user-scope";
import { z } from "zod";
import { reportJobService } from "../reports/report-job.service";
import { applyDownloadHeaders, sendDownloadBuffer } from "../../middlewares/download-headers";
import { logger } from "../../utils/logger";

const eventIdSchema = z.string().min(6, "eventId inválido");
const REPORT_ERROR_MESSAGE = "Não foi possível gerar o relatório. Verifique os dados do evento.";
const reportErrorPayload = { success: false, message: REPORT_ERROR_MESSAGE };

const parseAsyncFlag = (value: unknown) => {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["1", "true", "yes", "on"].includes(normalized)) return true;
    if (["0", "false", "no", "off"].includes(normalized)) return false;
  }
  if (typeof value === "boolean") return value;
  return false;
};

export const getEventSummaryHandler = async (request: Request, response: Response) => {
  try {
    const eventId = eventIdSchema.parse(request.params.eventId);
    const ministryIds = getScopedMinistryIds(request.user);
    await ensureEventMinistryAccess(eventId, ministryIds);
    const summary = await financialService.getEventSummary(eventId);
    return response.json(summary);
  } catch (error: any) {
    logger.error({ error }, "Erro ao obter resumo do evento");
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
    logger.error({ error }, "Erro ao obter resumo do distrito");
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
    logger.error({ error }, "Erro ao obter resumo da igreja");
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
    logger.error({ error }, "Erro ao obter resumo financeiro geral");
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
  // Aplicar headers de CORS antes de qualquer resposta
  applyDownloadHeaders(request, response);
  if (request.method === "OPTIONS") {
    return response.status(200).end();
  }
  try {
    const eventId = eventIdSchema.parse(request.params.eventId);
    const ministryIds = getScopedMinistryIds(request.user);
    await ensureEventMinistryAccess(eventId, ministryIds);
    if (parseAsyncFlag(request.query?.async)) {
      const job = reportJobService.createFinancialReportJob(
        { eventId },
        request.user?.id ?? null
      );
      return response.json({ success: true, jobId: job.id, status: job.status });
    }
    const reportData = await financialService.getEventFinancialReportData(eventId);
    if (reportData.paidOrdersCount === 0 && reportData.paidRegistrationsCount === 0) {
      return response.status(400).json(reportErrorPayload);
    }
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

    const fileName = `relatorio-financeiro-${reportData.event.slug ?? reportData.event.id}.pdf`;
    return sendDownloadBuffer(response, { buffer: pdfBuffer, fileName });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return response.status(400).json(reportErrorPayload);
    }
    logger.error({ error }, "Erro ao gerar relatório financeiro em PDF");
    const status = error?.statusCode ?? 500;
    return response.status(status).json(reportErrorPayload);
  }
};


