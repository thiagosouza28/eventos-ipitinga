import pino from "pino";

import { env } from "../config/env";
import { maskCpf } from "./mask";

const redactPaths = ["req.headers.authorization", "req.body.password", "req.body.buyerCpf"];
const isProduction = env.NODE_ENV === "production";

const baseOptions = {
  level: isProduction ? "info" : "debug",
  redact: {
    paths: redactPaths,
    censor: (value: unknown) => {
      if (typeof value === "string" && value.length === 11) {
        return maskCpf(value);
      }
      return "***";
    }
  }
} as const;

const destination = isProduction ? undefined : pino.destination({ sync: true });
export const logger = pino(baseOptions, destination);
export const requestLogger = logger.child({ module: "http" });
