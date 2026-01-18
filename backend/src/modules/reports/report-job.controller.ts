import { createReadStream } from "fs";
import { Request, Response } from "express";
import { z } from "zod";

import { reportJobService } from "./report-job.service";

const jobIdSchema = z.string().min(6, "jobId invalido");

const canAccessJob = (
  job: { requestedById?: string | null },
  user?: Request["user"]
) => {
  if (!user) return false;
  if (user.role === "AdminGeral") return true;
  if (!job.requestedById) return false;
  return job.requestedById === user.id;
};

export const getReportJobStatusHandler = async (request: Request, response: Response) => {
  try {
    const jobId = jobIdSchema.parse(request.params.jobId);
    const job = reportJobService.getJob(jobId);
    if (!job) {
      return response.status(404).json({ success: false, message: "Relatorio nao encontrado." });
    }
    if (!canAccessJob(job, request.user)) {
      return response.status(403).json({ success: false, message: "Acesso negado." });
    }
    return response.json({ success: true, job: reportJobService.getJobSummary(job) });
  } catch {
    return response.status(400).json({ success: false, message: "Requisicao invalida." });
  }
};

export const downloadReportJobFileHandler = async (request: Request, response: Response) => {
  try {
    const jobId = jobIdSchema.parse(request.params.jobId);
    const job = reportJobService.getJob(jobId);
    if (!job) {
      return response.status(404).json({ success: false, message: "Relatorio nao encontrado." });
    }
    if (!canAccessJob(job, request.user)) {
      return response.status(403).json({ success: false, message: "Acesso negado." });
    }
    if (job.status !== "DONE") {
      return response
        .status(409)
        .json({ success: false, message: "Relatorio ainda em processamento." });
    }
    const file = await reportJobService.getJobFile(jobId);
    if (!file) {
      return response.status(404).json({ success: false, message: "Arquivo nao encontrado." });
    }
    response.setHeader("Content-Type", "application/pdf");
    response.setHeader("Content-Disposition", `attachment; filename=\"${file.fileName}\"`);
    return createReadStream(file.filePath).pipe(response);
  } catch {
    return response.status(400).json({ success: false, message: "Requisicao invalida." });
  }
};
