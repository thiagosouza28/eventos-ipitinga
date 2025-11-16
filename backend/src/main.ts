import { spawn } from "child_process";
import { existsSync } from "fs";
import path from "path";

import { Prisma } from "@/prisma/generated/client";

import { createApp } from "./app";
import { env } from "./config/env";
import { startOrderExpirationJob } from "./jobs/order-expiration.job";
import { prisma } from "./lib/prisma";
import { closeReceiptBrowser } from "./pdf/receipt.service";
import { logger } from "./utils/logger";

const REQUIRED_TABLES = [
  "District",
  "Church",
  "Event",
  "EventLot",
  "Order",
  "Registration",
  "Refund",
  "WebhookEvent",
  "AuditLog",
  "User",
  "Expense"
];

const backendRoot = path.resolve(__dirname, "..");
const schemaPath = "src/prisma/schema.prisma";

const resolvePrismaBinary = () => {
  const binaryName = process.platform === "win32" ? "prisma.cmd" : "prisma";
  const candidate = path.resolve(backendRoot, "node_modules", ".bin", binaryName);
  if (existsSync(candidate)) {
    return { command: candidate, args: ["migrate", "deploy", "--schema", schemaPath], shell: false };
  }
  const fallback = process.platform === "win32" ? "npx.cmd" : "npx";
  return {
    command: fallback,
    args: ["prisma", "migrate", "deploy", "--schema", schemaPath],
    shell: process.platform === "win32"
  };
};

const runMigrations = () =>
  new Promise<void>((resolve, reject) => {
    const { command, args, shell } = resolvePrismaBinary();
    const child = spawn(command, args, {
      stdio: "inherit",
      shell,
      cwd: backendRoot
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
    const existingTables = await prisma.$queryRaw<{ name: string }[]>`
      SELECT table_name AS name
      FROM information_schema.tables
      WHERE table_schema = DATABASE() AND table_name IN (${Prisma.join(REQUIRED_TABLES)})
    `;

    const existing = new Set(existingTables.map((table) => table.name));
    const missing = REQUIRED_TABLES.filter((table) => !existing.has(table));

    if (missing.length) {
      logger.warn({ missing }, "Detectado schema incompleto. Executando prisma migrate deploy...");
      await runMigrations();
      logger.info("Migrations aplicadas com sucesso.");
    }
  } catch (error) {
    logger.error({ error }, "Falha ao garantir o schema do banco de dados.");
    throw error;
  }
};

const bootstrap = async () => {
  try {
    console.log("🔌 Testando conexão com o banco...");
    await prisma.$queryRaw`SELECT 1`;
    console.log("✅ Banco conectado");

    await ensureDatabaseSchema();

    const app = createApp();
    const port = env.PORT;
    const server = app.listen(port, "0.0.0.0", () => {
      logger.info(`API disponível em ${env.API_URL}`);
      console.log(`🚀 Server running on port ${port}`);
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
    console.error("❌ Erro ao conectar no banco:", error);
    logger.fatal({ error }, "Não foi possível iniciar o servidor.");
    process.exit(1);
  }
};

void bootstrap();
