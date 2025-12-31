import "express-async-errors";

import compression from "compression";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";

import { env } from "./config/env";
import { createConcurrencyLimiter } from "./middlewares/concurrency-limit";
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
  const corsOrigins =
    env.corsOrigins.includes("*") || !env.corsOrigins.length
      ? true
      : (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
          // Permitir chamadas locais mesmo se não estiverem listadas explicitamente
          if (!origin) return callback(null, true);
          if (env.corsOrigins.includes(origin)) return callback(null, true);
          if (origin.startsWith("http://localhost") || origin.startsWith("http://127.0.0.1")) {
            return callback(null, true);
          }
          return callback(null, false);
        };
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
      exposedHeaders: ["Content-Disposition"]
    })
  );

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
  app.use("/uploads", express.static(path.resolve(__dirname, "..", "tmp", "uploads")));

  app.use((request, _response, next) => {
    requestLogger.info({ method: request.method, path: request.path }, "HTTP request");
    next();
  });

  app.use("/api", publicLimiter);
  app.use("/api", router);
  app.use(errorHandler);

  return app;
};
