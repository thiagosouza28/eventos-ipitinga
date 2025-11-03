import pino from "pino";

import { maskCpf } from "./mask";

const redactPaths = ["req.headers.authorization", "req.body.password", "req.body.buyerCpf"];

export const logger = pino({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  transport:
    process.env.NODE_ENV === "production"
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
