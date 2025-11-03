import { createServer } from "http";
import { spawn } from "child_process";
import { existsSync } from "fs";
import path from "path";

import { Prisma } from "@prisma/client";

import { createApp } from "./app";
import { env } from "./config/env";
import { startOrderExpirationJob } from "./jobs/order-expiration.job";
import { prisma } from "./lib/prisma";
import { closeReceiptBrowser } from "./pdf/receipt.service";
import { logger } from "./utils/logger";

const REQUIRED_TABLES = ["Event", "EventLot"];

const resolvePrismaBinary = () => {
  const binaryName = process.platform === "win32" ? "prisma.cmd" : "prisma";
  const candidate = path.resolve(process.cwd(), "node_modules", ".bin", binaryName);
  if (existsSync(candidate)) {
    return { command: candidate, args: ["migrate", "deploy"], shell: false };
  }
  const fallback = process.platform === "win32" ? "npx.cmd" : "npx";
  return { command: fallback, args: ["prisma", "migrate", "deploy"], shell: process.platform === "win32" };
};

const runMigrations = () =>
  new Promise<void>((resolve, reject) => {
    const { command, args, shell } = resolvePrismaBinary();
    const child = spawn(command, args, {
      stdio: "inherit",
      shell
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Prisma migrate deploy exited with code ${code ?? "unknown"}`));
      }
    });

    child.on("error", (error) => {
      reject(error);
    });
  });

const ensureDatabaseSchema = async () => {
  try {
    const isSQLite =
      env.DATABASE_URL.startsWith("file:") || env.DATABASE_URL.includes("sqlite");

    const existingTables =
      isSQLite
        ? await prisma.$queryRaw<{ name: string }[]>`
            SELECT name
            FROM sqlite_master
            WHERE type = 'table' AND name IN (${Prisma.join(REQUIRED_TABLES)})
          `
        : await prisma.$queryRaw<{ name: string }[]>`
            SELECT table_name AS name
            FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name IN (${Prisma.join(REQUIRED_TABLES)})
          `;

    const existing = new Set(existingTables.map((table) => table.name));
    const missing = REQUIRED_TABLES.filter((table) => !existing.has(table));

    if (missing.length) {
      logger.warn(
        { missing },
        "Detectado schema incompleto. Executando prisma migrate deploy..."
      );
      await runMigrations();
      logger.info("Migrations aplicadas com sucesso.");
    }
  } catch (error) {
    logger.error({ error }, "Falha ao garantir o schema do banco de dados.");
    throw error;
  }
};

const start = async () => {
  try {
    await ensureDatabaseSchema();

    const app = createApp();
    const server = createServer(app);
    const port = env.PORT;

    server.listen(port, () => {
            logger.info(`?? API disponível em ${env.API_URL}`);
      startOrderExpirationJob();
    });

    const shutdown = async () => {
      logger.info("Encerrando servidor...");
      await prisma.$disconnect();
      await closeReceiptBrowser();
      server.close(() => {
        logger.info("Servidor encerrado com sucesso.");
        process.exit(0);
      });
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (error) {
        logger.fatal({ error }, "Não foi possível iniciar o servidor.");
    process.exit(1);
  }
};

void start();
