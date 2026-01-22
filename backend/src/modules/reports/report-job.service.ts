import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";

import { registrationService, type RegistrationFilters } from "../registrations/registration.service";
import { financialService } from "../financial/financial.service";
import { generateFinancialEventReportPdf } from "../../pdf/financial-report.service";
import { AppError } from "../../utils/errors";
import { logger } from "../../utils/logger";

type ReportJobType =
  | "REGISTRATION_REPORT"
  | "REGISTRATION_LIST"
  | "REGISTRATION_EVENT_SHEET"
  | "FINANCIAL_REPORT";

type ReportJobStatus = "PENDING" | "PROCESSING" | "DONE" | "FAILED";

type RegistrationReportParams = {
  filters: RegistrationFilters;
  groupBy: "event" | "church";
  template: "standard" | "event";
  layout?: "single" | "two" | "four";
  ministryIds?: string[];
};

type RegistrationListParams = {
  filters: RegistrationFilters;
  includeCpf: boolean;
  ministryIds?: string[];
};

type FinancialReportParams = {
  eventId: string;
};

type ReportJobParams = RegistrationReportParams | RegistrationListParams | FinancialReportParams;

export type ReportJob = {
  id: string;
  type: ReportJobType;
  status: ReportJobStatus;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date | null;
  requestedById?: string | null;
  filePath?: string | null;
  fileName?: string | null;
  errorMessage?: string | null;
  params: ReportJobParams;
};

export type ReportJobSummary = Pick<
  ReportJob,
  "id" | "type" | "status" | "createdAt" | "updatedAt" | "fileName" | "errorMessage" | "expiresAt"
>;

const REPORT_JOB_TTL_MS = 1000 * 60 * 30;
const REPORTS_DIR = path.resolve(__dirname, "..", "..", "tmp", "reports");

const jobStore = new Map<string, ReportJob>();
const jobQueue: string[] = [];
let processing = false;

const ensureReportsDir = async () => {
  await fs.mkdir(REPORTS_DIR, { recursive: true });
};

const cleanupExpiredJobs = async () => {
  const now = Date.now();
  const expired = Array.from(jobStore.values()).filter((job) => {
    const expiresAt = job.expiresAt?.getTime() ?? 0;
    return expiresAt > 0 && expiresAt <= now;
  });
  if (!expired.length) return;
  await Promise.all(
    expired.map(async (job) => {
      if (job.filePath) {
        try {
          await fs.unlink(job.filePath);
        } catch {
          // ignore
        }
      }
      jobStore.delete(job.id);
    })
  );
};

const buildFileName = (job: ReportJob) => {
  const timestamp = Date.now();
  if (job.type === "FINANCIAL_REPORT") {
    return `relatorio-financeiro-${timestamp}.pdf`;
  }
  if (job.type === "REGISTRATION_LIST") {
    return `lista-inscricoes-${timestamp}.pdf`;
  }
  const report = job.params as RegistrationReportParams;
  return `relatorio-inscricoes-${report.groupBy}-${timestamp}.pdf`;
};

const updateJob = (job: ReportJob, patch: Partial<ReportJob>) => {
  const updated: ReportJob = {
    ...job,
    ...patch,
    updatedAt: new Date()
  };
  jobStore.set(job.id, updated);
  return updated;
};

const persistJobPdf = async (job: ReportJob, buffer: Buffer) => {
  await ensureReportsDir();
  const filePath = path.join(REPORTS_DIR, `${job.id}.pdf`);
  await fs.writeFile(filePath, buffer);
  return updateJob(job, {
    status: "DONE",
    filePath,
    expiresAt: new Date(Date.now() + REPORT_JOB_TTL_MS)
  });
};

const resolveReportErrorMessage = (error: unknown) => {
  if (error instanceof AppError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return "Nao foi possivel gerar o relatorio agora.";
};

const failJob = (job: ReportJob, error: unknown) => {
  const message = resolveReportErrorMessage(error);
  logger.error({ err: error, jobId: job.id, jobType: job.type }, "Erro ao processar relatorio");
  return updateJob(job, {
    status: "FAILED",
    errorMessage: message,
    expiresAt: new Date(Date.now() + REPORT_JOB_TTL_MS)
  });
};

const processRegistrationReport = async (job: ReportJob) => {
  const params = job.params as RegistrationReportParams;
  await registrationService.validateReportAvailability(params.filters, params.ministryIds);
  const pdfBuffer =
    params.template === "event"
      ? await registrationService.generateEventSheetPdf(
          params.filters,
          params.groupBy,
          params.layout ?? "single",
          params.ministryIds
        )
      : await registrationService.generateReportPdf(params.filters, params.groupBy, params.ministryIds);
  return persistJobPdf(job, pdfBuffer);
};

const processRegistrationList = async (job: ReportJob) => {
  const params = job.params as RegistrationListParams;
  await registrationService.validateReportAvailability(params.filters, params.ministryIds);
  const pdfBuffer = await registrationService.generateListPdf(params.filters, params.ministryIds, {
    includeCpf: params.includeCpf
  });
  return persistJobPdf(job, pdfBuffer);
};

const processFinancialReport = async (job: ReportJob) => {
  const params = job.params as FinancialReportParams;
  const reportData = await financialService.getEventFinancialReportData(params.eventId);
  if (reportData.paidOrdersCount === 0 && reportData.paidRegistrationsCount === 0) {
    throw new AppError("Nenhum pagamento encontrado para o evento", 400);
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
  const fileName = reportData.event.slug
    ? `relatorio-financeiro-${reportData.event.slug}.pdf`
    : job.fileName;
  const updatedJob = updateJob(job, { fileName });
  return persistJobPdf(updatedJob, pdfBuffer);
};

const processJob = async (job: ReportJob) => {
  if (job.type === "REGISTRATION_REPORT" || job.type === "REGISTRATION_EVENT_SHEET") {
    return processRegistrationReport(job);
  }
  if (job.type === "REGISTRATION_LIST") {
    return processRegistrationList(job);
  }
  if (job.type === "FINANCIAL_REPORT") {
    return processFinancialReport(job);
  }
  throw new AppError("Tipo de relatorio nao suportado", 400);
};

const processQueue = async () => {
  while (jobQueue.length) {
    const jobId = jobQueue.shift();
    if (!jobId) continue;
    const job = jobStore.get(jobId);
    if (!job || job.status !== "PENDING") continue;
    const processingJob = updateJob(job, { status: "PROCESSING" });
    try {
      await processJob(processingJob);
    } catch (error) {
      failJob(processingJob, error);
    }
  }
  processing = false;
};

const scheduleProcessing = () => {
  if (processing) return;
  processing = true;
  setImmediate(() => {
    processQueue().catch((error) => {
      logger.error({ error }, "Erro no processamento da fila de relatorios");
      processing = false;
    });
  });
};

const enqueueJob = (job: ReportJob) => {
  jobStore.set(job.id, job);
  jobQueue.push(job.id);
  cleanupExpiredJobs().catch((error) =>
    logger.error({ error }, "Erro ao limpar relatorios expirados")
  );
  scheduleProcessing();
  return job;
};

const createJob = (
  type: ReportJobType,
  params: ReportJobParams,
  requestedById?: string | null
) => {
  const job: ReportJob = {
    id: randomUUID(),
    type,
    status: "PENDING",
    createdAt: new Date(),
    updatedAt: new Date(),
    requestedById: requestedById ?? null,
    fileName: null,
    params
  };
  job.fileName = buildFileName(job);
  return enqueueJob(job);
};

const getJobSummary = (job: ReportJob): ReportJobSummary => ({
  id: job.id,
  type: job.type,
  status: job.status,
  createdAt: job.createdAt,
  updatedAt: job.updatedAt,
  fileName: job.fileName ?? null,
  errorMessage: job.errorMessage ?? null,
  expiresAt: job.expiresAt ?? null
});

export const reportJobService = {
  createRegistrationReportJob: (
    params: RegistrationReportParams,
    requestedById?: string | null
  ) =>
    createJob(
      params.template === "event" ? "REGISTRATION_EVENT_SHEET" : "REGISTRATION_REPORT",
      params,
      requestedById
    ),
  createRegistrationListJob: (params: RegistrationListParams, requestedById?: string | null) =>
    createJob("REGISTRATION_LIST", params, requestedById),
  createFinancialReportJob: (params: FinancialReportParams, requestedById?: string | null) =>
    createJob("FINANCIAL_REPORT", params, requestedById),
  getJob: (jobId: string) => jobStore.get(jobId) ?? null,
  getJobSummary,
  async getJobFile(jobId: string) {
    const job = jobStore.get(jobId);
    if (!job || job.status !== "DONE" || !job.filePath) {
      return null;
    }
    try {
      await fs.stat(job.filePath);
      return { filePath: job.filePath, fileName: job.fileName ?? "relatorio.pdf" };
    } catch (error) {
      failJob(job, error);
      return null;
    }
  }
};
