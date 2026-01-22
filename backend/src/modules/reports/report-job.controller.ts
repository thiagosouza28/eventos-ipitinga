import { createReadStream } from "fs";
import { promises as fs } from "fs";
import { Request, Response } from "express";
import { z } from "zod";

import { reportJobService } from "./report-job.service";
import { applyDownloadHeaders, sendDownloadStream } from "../../middlewares/download-headers";

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
  applyDownloadHeaders(request, response);
  if (request.method === "OPTIONS") {
    return response.status(200).end();
  }

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
  // Aplicar headers de CORS antes de qualquer resposta
  applyDownloadHeaders(request, response);
  if (request.method === "OPTIONS") {
    return response.status(200).end();
  }

  try {
    const jobId = jobIdSchema.parse(request.params.jobId);
    const job = reportJobService.getJob(jobId);

    if (!job) {
      return response.status(404).json({ success: false, message: "Relatorio nao encontrado." });
    }

    if (!canAccessJob(job, request.user)) {
      return response.status(403).json({ success: false, message: "Acesso negado." });
    }

    if (job.status === "FAILED") {
      return response
        .status(500)
        .json({ success: false, message: job.errorMessage ?? "Falha ao gerar relatorio." });
    }
    if (job.status !== "DONE") {
      return response.status(409).json({ success: false, message: "Relatorio ainda em processamento." });
    }

    const file = await reportJobService.getJobFile(jobId);
    if (!file) {
      return response.status(404).json({ success: false, message: "Arquivo nao encontrado." });
    }

    // Verificar se arquivo realmente existe
    try {
      await fs.access(file.filePath);
    } catch {
      return response.status(404).json({ success: false, message: "Arquivo nao encontrado no servidor." });
    }

    // Obter tamanho do arquivo para Content-Length
    const stats = await fs.stat(file.filePath);
    
    // Enviar arquivo como stream
    return sendDownloadStream(response, {
      stream: createReadStream(file.filePath),
      fileName: file.fileName,
      contentLength: stats.size
    });
  } catch (error) {
    return response.status(400).json({ success: false, message: "Requisicao invalida." });
  }
};


