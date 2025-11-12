import "express-async-errors";

import compression from "compression";
import cors from "cors";
import express, { type RequestHandler } from "express";
import helmet from "helmet";
import path from "path";

import { env } from "./config/env";
import { errorHandler } from "./middlewares/error-handler";
import { normalizeBody } from "./middlewares/normalize-body";
import { publicLimiter } from "./middlewares/rate-limit";
import { requestLogger } from "./utils/logger";
import router from "./http/routes";

export const createApp = () => {
  const app = express();

  app.disable("x-powered-by");
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" }
    })
  );
  app.use(cors({ origin: env.corsOrigins, credentials: true }));
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ limit: "10mb", extended: true }));
  app.use(normalizeBody); // Normalizar body após parse do JSON
  app.use(compression());
  app.use("/uploads", express.static(path.resolve(__dirname, "..", "tmp", "uploads")));

  app.use((request, _response, next) => {
    requestLogger.info({ method: request.method, path: request.path }, "HTTP request");
    next();
  });

  const limiterMiddleware = publicLimiter as unknown as RequestHandler;
  app.use("/api", limiterMiddleware);
  app.use("/api", router);

  app.use(errorHandler);

  return app;
};
