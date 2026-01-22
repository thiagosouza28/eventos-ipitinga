import { NextFunction, Request, Response } from "express";
import { env } from "../config/env";

const isProduction = env.NODE_ENV === "production";
const appHost = new URL(env.APP_URL).hostname;
const apiHost = new URL(env.API_URL).hostname;

const extractHostname = (origin: string) => {
  try {
    return new URL(origin).hostname;
  } catch {
    return null;
  }
};

const isPrivateNetworkHost = (host: string | null) => {
  if (!host) return false;
  if (host === "localhost" || host === "127.0.0.1") return true;
  const match = host.match(/^(\d{1,3}\.){3}\d{1,3}$/);
  if (!match) return false;
  const parts = host.split(".").map((part) => Number(part));
  if (parts.some((part) => Number.isNaN(part) || part < 0 || part > 255)) return false;
  if (parts[0] === 10) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  return false;
};

/**
 * Aplica headers de CORS e segurança para downloads de arquivo
 * Garante que:
 * - CORS seja habilitado corretamente
 * - Headers de download sejam enviados
 * - Validações de acesso funcionem
 */
export const applyDownloadHeaders = (request: Request, response: Response) => {
  const origin = request.headers.origin;
  const allowedOrigins = env.corsOrigins ?? [];
  const allowAnyOrigin = allowedOrigins.includes("*");

  // Determinar origem permitida
  let resolvedOrigin: string | undefined;
  if (origin) {
    const originHost = extractHostname(origin);
    const isLocalOrigin =
      origin.startsWith("http://localhost") || origin.startsWith("http://127.0.0.1");
    const isSameHost = originHost === appHost || originHost === apiHost;
    const isDevNetworkOrigin = !isProduction && isPrivateNetworkHost(originHost);
    if (allowAnyOrigin || allowedOrigins.includes(origin) || isLocalOrigin || isSameHost || isDevNetworkOrigin) {
      resolvedOrigin = origin;
    }
  } else if (allowAnyOrigin) {
    resolvedOrigin = "*";
  }

  // Aplicar headers CORS se houver origem válida
  if (resolvedOrigin) {
    response.setHeader("Access-Control-Allow-Origin", resolvedOrigin);
    if (resolvedOrigin !== "*") {
      response.setHeader("Access-Control-Allow-Credentials", "true");
    }
    response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    response.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
    response.setHeader(
      "Access-Control-Expose-Headers",
      "Content-Disposition, Content-Length, Content-Type"
    );
    response.setHeader("Vary", "Origin");
  }
};

/**
 * Middleware para preflight OPTIONS em rotas de download
 */
export const handleDownloadOptions = (request: Request, response: Response) => {
  applyDownloadHeaders(request, response);
  if (request.method === "OPTIONS") {
    return response.status(200).end();
  }
};

/**
 * Middleware dedicado para CORS em rotas de download.
 */
export const downloadCorsMiddleware = (
  request: Request,
  response: Response,
  next: NextFunction
) => {
  applyDownloadHeaders(request, response);
  if (request.method === "OPTIONS") {
    return response.status(200).end();
  }
  return next();
};

export const resolveContentType = (fileName?: string | null) => {
  const safeName = (fileName ?? "").toLowerCase();
  if (safeName.endsWith(".pdf")) return "application/pdf";
  if (safeName.endsWith(".xlsx")) {
    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  }
  if (safeName.endsWith(".xls")) return "application/vnd.ms-excel";
  if (safeName.endsWith(".csv")) return "text/csv";
  return "application/octet-stream";
};

/**
 * Define headers padrão de download de arquivo
 */
export const setDownloadHeaders = (
  response: Response,
  fileName: string,
  contentType: string = "application/octet-stream",
  contentLength?: number
) => {
  response.setHeader("Content-Type", contentType);
  response.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  if (typeof contentLength === "number") {
    response.setHeader("Content-Length", String(contentLength));
  }
  // Evitar cache de downloads
  response.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  response.setHeader("Pragma", "no-cache");
  response.setHeader("Expires", "0");
};

export const sendDownloadBuffer = (
  response: Response,
  payload: { buffer: Buffer; fileName: string; contentType?: string }
) => {
  setDownloadHeaders(
    response,
    payload.fileName,
    payload.contentType ?? resolveContentType(payload.fileName),
    payload.buffer.length
  );
  return response.status(200).send(payload.buffer);
};

export const sendDownloadStream = (
  response: Response,
  payload: { stream: NodeJS.ReadableStream; fileName: string; contentType?: string; contentLength?: number }
) => {
  setDownloadHeaders(
    response,
    payload.fileName,
    payload.contentType ?? resolveContentType(payload.fileName),
    payload.contentLength
  );
  response.status(200);
  return payload.stream.pipe(response);
};

