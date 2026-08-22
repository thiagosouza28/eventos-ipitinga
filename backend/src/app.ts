import "express-async-errors";

import path from "node:path";
import compression from "compression";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import { env } from "./config/env";
import { uploadMiddleware } from "./config/upload";
import { uploadImageHandler } from "./modules/uploads/upload.controller";
import { createConcurrencyLimiter } from "./middlewares/concurrency-limit";
import { errorHandler } from "./middlewares/error-handler";
import { normalizeBody } from "./middlewares/normalize-body";
import { requestLogger } from "./utils/logger";
import { routes } from "./routes/routes";
import { prisma } from "./lib/prisma";

const isPrivateNetworkHost = (host: string | null) => {
  if (!host) return false;
  if (host === "localhost" || host === "127.0.0.1") return true;
  const parts = host.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  return parts[0] === 10 || (parts[0] === 192 && parts[1] === 168) || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31);
};

const originAllowed = (origin?: string) => {
  if (!origin || env.corsOrigins.includes("*")) return true;
  if (env.corsOrigins.includes(origin.replace(/\/$/, "")) || env.corsOrigins.includes(origin)) return true;
  try {
    const host = new URL(origin).hostname;
    if (host === "localhost" || host === "127.0.0.1") return true;
    return env.NODE_ENV !== "production" && isPrivateNetworkHost(host);
  } catch {
    return false;
  }
};

export const createApp = () => {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  app.use(helmet({
    crossOriginOpenerPolicy: false,
    crossOriginEmbedderPolicy: false,
    originAgentCluster: false,
    hsts: env.NODE_ENV === "production",
    crossOriginResourcePolicy: { policy: "cross-origin" }
  }));
  app.use(cors({
    origin: (origin, callback) => callback(null, originAllowed(origin)),
    credentials: true,
    exposedHeaders: ["Content-Disposition"],
    optionsSuccessStatus: 204
  }));
  app.use(createConcurrencyLimiter({
    maxConcurrent: env.MAX_CONCURRENT_REQUESTS,
    maxQueue: env.MAX_PENDING_REQUESTS,
    queueTimeoutMs: env.REQUEST_QUEUE_TIMEOUT_MS
  }));
  app.use(rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false
  }));
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));
  app.use(normalizeBody);
  app.use(compression());
  app.use("/uploads", express.static(path.resolve(process.cwd(), "public", "uploads"), {
    maxAge: env.STATIC_CACHE_MAX_AGE_MS
  }));

  app.get("/api/health", async (_request, response) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return response.json({ status: "ok", service: "eventos-ipitinga-backend", database: "connected" });
    } catch {
      return response.status(503).json({
        status: "degraded",
        service: "eventos-ipitinga-backend",
        database: "unavailable"
      });
    }
  });

  routes.forEach((route) => {
    const handlers: any[] = [...route.handlers];
    if (route.options?.upload) {
      handlers.push(uploadMiddleware.single("file"), uploadImageHandler);
    }
    (app as any)[route.method.toLowerCase()](`/api${route.path}`, ...handlers);
  });

  app.use((request, _response, next) => {
    requestLogger.debug({ method: request.method, path: request.path }, "Rota não encontrada");
    next();
  });
  app.use((_request, response) => response.status(404).json({ message: "Rota não encontrada." }));
  app.use(errorHandler);
  return app;
};
