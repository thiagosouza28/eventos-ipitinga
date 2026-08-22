import { createApp } from "./app";
import { env } from "./config/env";
import { startOrderExpirationJob, stopOrderExpirationJob } from "./jobs/order-expiration.job";
import { prisma } from "./lib/prisma";
import { closeReceiptBrowser } from "./pdf/receipt.service";
import { logger } from "./utils/logger";

const bootstrap = async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    const isDevelopmentCommand = process.env.npm_lifecycle_event === "dev";
    if (!isDevelopmentCommand) throw error;
    logger.warn(
      { error },
      "Banco de dados indisponível; iniciando a API em modo de desenvolvimento para permitir diagnóstico"
    );
  }
  const app = createApp();
  const server = app.listen(env.PORT, "0.0.0.0", () => {
    logger.info({ port: env.PORT, apiUrl: env.API_URL }, "Backend iniciado");
    startOrderExpirationJob();
  });

  server.keepAliveTimeout = env.SERVER_KEEP_ALIVE_TIMEOUT_MS;
  server.headersTimeout = Math.max(env.SERVER_HEADERS_TIMEOUT_MS, server.keepAliveTimeout + 1000);
  server.requestTimeout = env.SERVER_REQUEST_TIMEOUT_MS;

  const shutdown = async (signal: string) => {
    logger.info({ signal }, "Encerrando backend");
    stopOrderExpirationJob();
    await closeReceiptBrowser();
    await prisma.$disconnect();
    server.close(() => process.exit(0));
  };

  process.once("SIGINT", () => void shutdown("SIGINT"));
  process.once("SIGTERM", () => void shutdown("SIGTERM"));
};

bootstrap().catch((error) => {
  logger.fatal({ error }, "Falha ao iniciar o backend");
  process.exit(1);
});
