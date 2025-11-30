import "express-async-errors";

import compression from "compression";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";

import { env } from "./config/env";
import { errorHandler } from "./middlewares/error-handler";
import { normalizeBody } from "./middlewares/normalize-body";
import { publicLimiter } from "./middlewares/rate-limit";
import { requestLogger } from "./utils/logger";
import router from "./routes";

export const createApp = () => {
  const app = express();

  app.disable("x-powered-by");
  // Só confia nos cabeçalhos X-Forwarded-* em produção (atrás de proxy conhecido)
  const trustProxySetting =
    env.NODE_ENV === "production" ? ["loopback", "linklocal", "uniquelocal"] : false;
  app.set("trust proxy", trustProxySetting);
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" }
    })
  );
  app.use(cors({ origin: env.corsOrigins, credentials: true }));

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
