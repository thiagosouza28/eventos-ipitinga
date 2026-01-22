import "express-async-errors";

import compression from "compression";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";

import { env } from "./config/env";
import { createConcurrencyLimiter } from "./middlewares/concurrency-limit";
import { downloadCorsMiddleware } from "./middlewares/download-headers";
import { errorHandler } from "./middlewares/error-handler";
import { normalizeBody } from "./middlewares/normalize-body";
import { publicLimiter } from "./middlewares/rate-limit";
import { requestLogger } from "./utils/logger";
import router from "./routes";

export const createApp = () => {
  const app = express();

  app.disable("x-powered-by");
  // Confiar no proxy reverso (Nginx/ALB) para interpretar X-Forwarded-For corretamente com rate limiting
  // Usamos "1" para um hop de proxy conhecido. Ajuste se houver múltiplos proxies em cadeia.
  app.set("trust proxy", 1);
  const isProduction = env.NODE_ENV === "production";
  const appHost = new URL(env.APP_URL).hostname;
  const apiHost = new URL(env.API_URL).hostname;
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
  const getHost = (origin: string) => {
    try {
      return new URL(origin).hostname;
    } catch {
      return null;
    }
  };
  const isOriginAllowed = (origin?: string) => {
    if (!origin) return true;
    if (env.corsOrigins.includes(origin)) return true;
    if (origin.startsWith("http://localhost") || origin.startsWith("http://127.0.0.1")) {
      return true;
    }
    const host = getHost(origin);
    if (host === appHost || host === apiHost) return true;
    if (!isProduction && isPrivateNetworkHost(host)) return true;
    return false;
  };
  const corsOrigins =
    env.corsOrigins.includes("*") || !env.corsOrigins.length
      ? true
      : (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
          if (isOriginAllowed(origin)) return callback(null, true);
          return callback(null, false);
        };
  const corsAllowedHeaders = ["Authorization", "Content-Type", "Accept", "Origin", "X-Requested-With"];
  app.set("corsOrigins", env.corsOrigins);
  app.use(
    helmet({
      // COOP/COEP/OAC serao definidos no Nginx para evitar duplicidade e garantir contexto seguro
      crossOriginOpenerPolicy: false,
      crossOriginEmbedderPolicy: false,
      originAgentCluster: false,
      hsts: false,
      crossOriginResourcePolicy: { policy: "cross-origin" }
    })
  );
  app.use(
    cors({
      origin: corsOrigins,
      credentials: true,
      allowedHeaders: corsAllowedHeaders,
      exposedHeaders: ["Content-Disposition"],
      optionsSuccessStatus: 200
    })
  );

  app.use("/api/receipts/:registrationId.pdf", downloadCorsMiddleware);
  app.use("/api/admin/registrations/report.pdf", downloadCorsMiddleware);
  app.use("/api/admin/registrations/list.pdf", downloadCorsMiddleware);
  app.use("/api/admin/reports/jobs/:jobId/file", downloadCorsMiddleware);
  app.use("/api/admin/financial/events/:eventId/report.pdf", downloadCorsMiddleware);

  const concurrencyLimiter = createConcurrencyLimiter({
    maxConcurrent: env.MAX_CONCURRENT_REQUESTS,
    maxQueue: env.MAX_PENDING_REQUESTS,
    queueTimeoutMs: env.REQUEST_QUEUE_TIMEOUT_MS
  });
  app.use(concurrencyLimiter);

  const globalLimiter = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false
  });
  app.use(globalLimiter);

  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ limit: "10mb", extended: true }));
  app.use(normalizeBody);
  app.use(compression());
  app.use(
    "/uploads",
    express.static(path.resolve(__dirname, "..", "tmp", "uploads"), {
      maxAge: env.STATIC_CACHE_MAX_AGE_MS,
      immutable: false
    })
  );

  app.use((request, _response, next) => {
    requestLogger.info({ method: request.method, path: request.path }, "HTTP request");
    next();
  });

  app.use("/api", publicLimiter);
  app.use("/api", router);
  app.use(errorHandler);

  return app;
};
