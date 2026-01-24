import { Request, Response } from "express";
import { z } from "zod";
import * as XLSX from "xlsx";

import { adminRegistrationsReportService } from "./admin-registrations-report.service";
import { applyDownloadHeaders, sendDownloadBuffer } from "../../middlewares/download-headers";
import { AppError } from "../../utils/errors";
import { logger } from "../../utils/logger";
import { getScopedMinistryIds } from "../../utils/user-scope";
import { generateAdminRegistrationsReportPdf } from "../../pdf/admin-registrations-report.service";

const REPORT_ERROR_MESSAGE = "Nao foi possivel gerar o relatorio administrativo.";
const reportErrorPayload = { success: false, message: REPORT_ERROR_MESSAGE };

const respondReportError = (response: Response, error: unknown, context: string) => {
  logger.error({ error }, context);
  const status = error instanceof AppError ? error.statusCode : 500;
  return response.status(status).json(reportErrorPayload);
};

const optionalId = z.preprocess((value) => {
  if (typeof value !== "string") return undefined;
  const s = value.trim();
  if (s.length === 0) return undefined;
  const isUuid = z.string().uuid().safeParse(s).success;
  const isCuid = z.string().cuid().safeParse(s).success;
  return isUuid || isCuid ? s : undefined;
}, z.string().optional());

const optionalDate = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().optional()
);

const reportFiltersSchema = z.object({
  districtId: optionalId,
  eventId: optionalId,
  lotId: optionalId,
  startDate: optionalDate,
  endDate: optionalDate
});

type ReportFilters = z.infer<typeof reportFiltersSchema> & { churchId?: string; ministryIds?: string[] };

const applyScopedFilters = (filters: ReportFilters, user?: Request["user"]) => {
  if (!user) return filters;
  const scoped: ReportFilters = { ...filters };
  if (user.role === "DiretorLocal") {
    if (user.districtScopeId) {
      scoped.districtId = user.districtScopeId;
    }
    if (user.churchId) {
      scoped.churchId = user.churchId;
    }
  } else if (user.role === "AdminDistrital") {
    if (user.districtScopeId) {
      scoped.districtId = user.districtScopeId;
    }
  }
  return scoped;
};

const buildCsv = (items: { districtName: string; eventTitle: string; lotName: string; registrationsCount: number }[], total: number) => {
  const headers = ["Distrito", "Evento", "Lote", "Quantidade"];
  const toCsvValue = (value: string | number) => `"${String(value).replace(/\"/g, '""')}"`;
  const rows = items.map((item) => [
    toCsvValue(item.districtName),
    toCsvValue(item.eventTitle),
    toCsvValue(item.lotName),
    toCsvValue(item.registrationsCount)
  ]);
  rows.push(["", "", toCsvValue("Total geral"), toCsvValue(total)]);
  const csv = [headers.map(toCsvValue).join(";"), ...rows.map((row) => row.join(";"))].join("\n");
  return Buffer.from(`\uFEFF${csv}`, "utf-8");
};

const buildXlsx = (items: { districtName: string; eventTitle: string; lotName: string; registrationsCount: number }[], total: number) => {
  const rows = [
    ["Distrito", "Evento", "Lote", "Quantidade"],
    ...items.map((item) => [item.districtName, item.eventTitle, item.lotName, item.registrationsCount]),
    [],
    ["Total geral", "", "", total]
  ];

  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet["!cols"] = [{ wch: 26 }, { wch: 34 }, { wch: 26 }, { wch: 14 }];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Relatorio");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
};

const getReportData = async (request: Request) => {
  const filters = reportFiltersSchema.parse(request.query);
  const scopedFilters = applyScopedFilters(filters, request.user);
  const ministryIds = getScopedMinistryIds(request.user);
  return adminRegistrationsReportService.getReport({
    ...scopedFilters,
    ministryIds
  });
};

export const adminRegistrationsReportHandler = async (request: Request, response: Response) => {
  try {
    const report = await getReportData(request);
    return response.json(report);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      logger.warn({ error: error.flatten() }, "Parametros invalidos");
      return response.status(400).json(reportErrorPayload);
    }
    return respondReportError(response, error, "Erro ao carregar relatorio administrativo");
  }
};

export const downloadAdminRegistrationsReportCsvHandler = async (request: Request, response: Response) => {
  applyDownloadHeaders(request, response);
  if (request.method === "OPTIONS") {
    return response.status(200).end();
  }
  try {
    const report = await getReportData(request);
    const buffer = buildCsv(report.items, report.totals.total);
    const fileName = `relatorio-administrativo-inscricoes-${Date.now()}.csv`;
    return sendDownloadBuffer(response, { buffer, fileName, contentType: "text/csv" });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      logger.warn({ error: error.flatten() }, "Parametros invalidos");
      return response.status(400).json(reportErrorPayload);
    }
    return respondReportError(response, error, "Erro ao exportar relatorio administrativo em CSV");
  }
};

export const downloadAdminRegistrationsReportXlsxHandler = async (request: Request, response: Response) => {
  applyDownloadHeaders(request, response);
  if (request.method === "OPTIONS") {
    return response.status(200).end();
  }
  try {
    const report = await getReportData(request);
    const buffer = buildXlsx(report.items, report.totals.total);
    const fileName = `relatorio-administrativo-inscricoes-${Date.now()}.xlsx`;
    return sendDownloadBuffer(response, {
      buffer,
      fileName,
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      logger.warn({ error: error.flatten() }, "Parametros invalidos");
      return response.status(400).json(reportErrorPayload);
    }
    return respondReportError(response, error, "Erro ao exportar relatorio administrativo em Excel");
  }
};

export const downloadAdminRegistrationsReportPdfHandler = async (request: Request, response: Response) => {
  applyDownloadHeaders(request, response);
  if (request.method === "OPTIONS") {
    return response.status(200).end();
  }
  try {
    const report = await getReportData(request);
    const pdfBuffer = await generateAdminRegistrationsReportPdf(report);
    const fileName = `relatorio-administrativo-inscricoes-${Date.now()}.pdf`;
    return sendDownloadBuffer(response, { buffer: pdfBuffer, fileName });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      logger.warn({ error: error.flatten() }, "Parametros invalidos");
      return response.status(400).json(reportErrorPayload);
    }
    return respondReportError(response, error, "Erro ao exportar relatorio administrativo em PDF");
  }
};
