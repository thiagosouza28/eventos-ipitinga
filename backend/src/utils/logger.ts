import pino from "pino";

import { env } from "../config/env";
import { maskCpf } from "./mask";

const redactPaths = ["req.headers.authorization", "req.body.password", "req.body.buyerCpf"];

const isProduction = env.NODE_ENV === "production";

export const logger = pino({
  level: isProduction ? "info" : "debug",
  transport:
    isProduction
      ? undefined
      : {
          target: "pino-pretty",
          options: {
            translateTime: "SYS:standard",
            ignore: "pid,hostname"
          }
        },
  redact: {
    paths: redactPaths,
    censor: (value: unknown) => {
      if (typeof value === "string" && value.length === 11) {
        return maskCpf(value);
      }
      return "***";
    }
  }
});

export const requestLogger = logger.child({ module: "http" });
