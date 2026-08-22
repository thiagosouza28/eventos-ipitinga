import { config } from "dotenv";
import { existsSync } from "node:fs";
import path from "path";
import { z } from "zod";

const projectRoot = path.resolve(process.cwd());

const isNextBuild = () => {
  const nextPhase = (process.env.NEXT_PHASE ?? "").toLowerCase();
  if (nextPhase.includes("build")) return true;

  const lifecycle = (process.env.npm_lifecycle_event ?? "").toLowerCase();
  if (lifecycle === "build" || lifecycle === "vercel-build") return true;

  const argv = process.argv.join(" ").toLowerCase();
  if (argv.includes("next") && argv.includes("build")) return true;

  return false;
};

const isBuildRuntime = isNextBuild();
const rootEnvPath = path.resolve(projectRoot, ".env");
const backendEnvPath = path.resolve(projectRoot, "backend", ".env");
const envPath = existsSync(rootEnvPath)
  ? rootEnvPath
  : existsSync(backendEnvPath)
    ? backendEnvPath
    : rootEnvPath;
const localEnvPath = path.resolve(projectRoot, ".env.local");

// Variáveis definidas pela hospedagem sempre prevalecem. O arquivo .env também
// funciona em servidores Node/PM2 e nunca precisa ser importado pelo frontend.
config({ path: envPath, override: false, quiet: true });

// `npm run dev` usa uma configuração local isolada, preservando o `.env`
// utilizado pelo servidor de produção/cPanel.
if (process.env.npm_lifecycle_event === "dev" && existsSync(localEnvPath)) {
  config({ path: localEnvPath, override: true, quiet: true });
}

const isTestRuntime =
  process.env.NODE_ENV === "test" || typeof process.env.JEST_WORKER_ID !== "undefined";

const buildDefaults = isBuildRuntime
  ? {
      NODE_ENV: "production",
      APP_URL: "https://example.com",
      API_URL: "https://example.com/api",
      DATABASE_URL: "mysql://user:pass@localhost:3306/db",
      JWT_SECRET: "x".repeat(32),
      MP_ACCESS_TOKEN: "BUILD-MP-TOKEN",
      PDF_SIGN_SECRET: "build-pdf-secret",
      HMAC_SECRET: "build-hmac-secret",
      ADMIN_EMAIL: "admin@example.com",
      ADMIN_PASSWORD: "Admin123!",
      SMTP_USER: "no-reply@example.com",
      SMTP_PASS: "build-smtp-pass",
      EMAIL_FROM: "no-reply@example.com"
    }
  : {};

const testDefaults = isTestRuntime
  ? {
      APP_URL: "http://localhost:3001",
      API_URL: "http://localhost:3001/api",
      DATABASE_URL: "file:./dev.db",
      JWT_SECRET: "test-secret-should-be-32-chars-long",
      MP_ACCESS_TOKEN: "TEST-MP-TOKEN",
      PDF_SIGN_SECRET: "test-pdf-secret",
      HMAC_SECRET: "test-hmac-secret",
      ADMIN_EMAIL: "admin@catre.test",
      ADMIN_PASSWORD: "Admin123!",
      CHECKIN_CONFIRM_PASSWORD: "checkin123"
    }
  : {};

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  SERVER_RUNTIME: z.enum(["server", "serverless"]).optional(),
  PORT: z.coerce.number().default(3001),
  APP_URL: z.string().url(),
  API_URL: z.string().url(),
  PUBLIC_APP_URL: z.string().url().optional(),
  DATABASE_URL: z.string().min(1),
  DATABASE_POOL_LIMIT: z.coerce.number().int().positive().default(20),
  DATABASE_POOL_TIMEOUT: z.coerce.number().int().positive().default(10),
  JWT_SECRET: z.string().min(32, "JWT_SECRET deve possuir ao menos 32 caracteres"),
  JWT_EXPIRES_IN: z.string().default("30d"),
  PASSWORD_SALT_ROUNDS: z.coerce.number().default(10),
  STORAGE_DRIVER: z.enum(["local", "supabase", "s3", "in-memory"]).default("local"),
  SUPABASE_URL: z.string().optional(),
  SUPABASE_PUBLIC_KEY: z.string().optional(),
  SUPABASE_SERVICE_KEY: z.string().optional(),
  SUPABASE_STORAGE_BUCKET: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),
  MP_ACCESS_TOKEN: z.string().min(1),
  MP_WEBHOOK_SECRET: z.string().optional(),
  MP_INTEGRATOR_ID: z.string().optional(),
  MP_WEBHOOK_PUBLIC_URL: z.string().url().optional(),
  MP_TRANSFER_URL: z.string().url().default("https://api.mercadopago.com/v1/transfers"),
  PDF_SIGN_SECRET: z.string().min(1),
  HMAC_SECRET: z.string().min(1),
  CORS_ORIGINS: z.string().default("http://localhost:3000"),
  MAX_CONCURRENT_REQUESTS: z.coerce.number().int().positive().default(20),
  MAX_PENDING_REQUESTS: z.coerce.number().int().min(0).default(100),
  REQUEST_QUEUE_TIMEOUT_MS: z.coerce.number().int().min(0).default(15000),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  ORDER_EXPIRATION_MINUTES: z.coerce.number().default(45),
  CRON_CANCEL_EXPIRED: z.string().default("*/5 * * * *"),
  CACHE_TTL_MS: z.coerce.number().int().min(0).default(30000),
  CACHE_MAX_ENTRIES: z.coerce.number().int().positive().default(500),
  SCHEMA_CACHE_TTL_MS: z.coerce.number().int().min(0).default(300000),
  PERMISSIONS_CACHE_TTL_MS: z.coerce.number().int().min(0).default(60000),
  RECEIPT_MAX_CONCURRENCY: z.coerce.number().int().positive().default(2),
  SERVER_KEEP_ALIVE_TIMEOUT_MS: z.coerce.number().int().positive().default(65000),
  SERVER_HEADERS_TIMEOUT_MS: z.coerce.number().int().positive().default(66000),
  SERVER_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(120000),
  STATIC_CACHE_MAX_AGE_MS: z.coerce.number().int().min(0).default(3600000),
  MP_TRANSFER_TIMEOUT_MS: z.coerce.number().int().positive().default(10000),
  MP_TRANSFER_MAX_RETRIES: z.coerce.number().int().min(0).default(1),
  MP_READ_MAX_RETRIES: z.coerce.number().int().min(0).default(1),
  MP_READ_RETRY_DELAY_MS: z.coerce.number().int().min(0).default(300),
  ALLOW_INSECURE_AUTO_RETURN: z.coerce.boolean().default(false),
  PLAYWRIGHT_EXECUTABLE_PATH: z.string().optional(),
  CHROMIUM_EXECUTABLE_PATH: z.string().optional(),
  RECEIPT_STORAGE_DIR: z.string().optional(),
  AUTO_MIGRATE: z.string().optional(),
  ADMIN_EMAIL: z.string().email(),
  ADMIN_PASSWORD: z.string().min(8),
  CHECKIN_CONFIRM_PASSWORD: z.string().min(4).optional(),
  SMTP_HOST: z.string().default("smtp.gmail.com"),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().email("SMTP_USER deve ser um e-mail válido"),
  SMTP_PASS: z.string().min(1, "SMTP_PASS não pode ser vazio"),
  EMAIL_FROM: z.string().email("EMAIL_FROM deve ser um e-mail válido")
});

const parsed = envSchema.safeParse({ ...buildDefaults, ...testDefaults, ...process.env });

if (!parsed.success) {
  console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
  throw new Error(
    "Invalid configuration. Check the environment variables (cPanel Setup Node.js App or local .env in development)."
  );
}

const rawEnv = parsed.data;

if (rawEnv.NODE_ENV === "production" && !isBuildRuntime) {
  const forbiddenValues = ["change_me", "changeme", "your_", "example.com"];
  const assertProductionSecret = (key: string, value: string | undefined) => {
    const normalized = (value ?? "").trim().toLowerCase();
    if (!normalized || forbiddenValues.some((entry) => normalized.includes(entry))) {
      throw new Error(`${key} precisa ser configurada com um valor seguro em produção.`);
    }
  };
  assertProductionSecret("JWT_SECRET", rawEnv.JWT_SECRET);
  assertProductionSecret("PDF_SIGN_SECRET", rawEnv.PDF_SIGN_SECRET);
  assertProductionSecret("HMAC_SECRET", rawEnv.HMAC_SECRET);
  assertProductionSecret("ADMIN_PASSWORD", rawEnv.ADMIN_PASSWORD);
  assertProductionSecret("CRON_SECRET", process.env.CRON_SECRET);
  if (rawEnv.MP_ACCESS_TOKEN) {
    assertProductionSecret("MP_WEBHOOK_SECRET", rawEnv.MP_WEBHOOK_SECRET);
    if (!rawEnv.MP_WEBHOOK_PUBLIC_URL?.startsWith("https://")) {
      throw new Error("MP_WEBHOOK_PUBLIC_URL precisa ser uma URL pública HTTPS em produção.");
    }
  }
  if (rawEnv.STORAGE_DRIVER === "supabase") {
    assertProductionSecret("SUPABASE_URL", rawEnv.SUPABASE_URL);
    assertProductionSecret("SUPABASE_SERVICE_KEY", rawEnv.SUPABASE_SERVICE_KEY);
    assertProductionSecret("SUPABASE_STORAGE_BUCKET", rawEnv.SUPABASE_STORAGE_BUCKET);
  }
}

const ensureHttpsUrl = (label: string, url: string) => {
  if (!url.toLowerCase().startsWith("https://")) {
    throw new Error(`${label} deve usar HTTPS quando o ambiente estiver em produção.`);
  }
};

if (rawEnv.NODE_ENV === "production") {
  const allowInsecureFlag = process.env.ALLOW_INSECURE_APP_URL?.toLowerCase();
  const allowInsecure =
    allowInsecureFlag === "1" || allowInsecureFlag === "true" || allowInsecureFlag === "yes";
  const isPrivateHost = (value: string) => {
    try {
      const host = new URL(value).hostname;
      if (host === "localhost" || host === "127.0.0.1") return true;
      const match = host.match(/^(\d{1,3}\.){3}\d{1,3}$/);
      if (!match) return false;
      const [a, b, c, d] = host.split(".").map((part) => Number(part));
      if ([a, b, c, d].some((part) => Number.isNaN(part))) return false;
      if (a === 10) return true;
      if (a === 192 && b === 168) return true;
      if (a === 172 && b >= 16 && b <= 31) return true;
      return false;
    } catch {
      return false;
    }
  };
  const shouldEnforceHttps = (value: string) => !allowInsecure && !isPrivateHost(value);
  if (shouldEnforceHttps(rawEnv.APP_URL)) {
    ensureHttpsUrl("APP_URL", rawEnv.APP_URL);
  }
  if (shouldEnforceHttps(rawEnv.API_URL)) {
    ensureHttpsUrl("API_URL", rawEnv.API_URL);
  }
  if (rawEnv.PUBLIC_APP_URL && shouldEnforceHttps(rawEnv.PUBLIC_APP_URL)) {
    ensureHttpsUrl("PUBLIC_APP_URL", rawEnv.PUBLIC_APP_URL);
  }
}

const resolveSqliteUrl = (url: string) => {
  if (!url.startsWith("file:")) return url;
  const [pathPart, queryPart] = url.slice("file:".length).split("?");
  const absolutePath = path.isAbsolute(pathPart)
    ? pathPart
    : path.resolve(projectRoot, pathPart);
  return `file:${absolutePath}${queryPart ? `?${queryPart}` : ""}`;
};

const applyDatabasePoolOptions = (url: string, limit: number, poolTimeout: number) => {
  if (limit <= 0 && poolTimeout <= 0) return url;
  if (url.startsWith("file:")) return url;
  try {
    const dbUrl = new URL(url);
    const protocol = dbUrl.protocol.replace(":", "");
    if (!["mysql", "postgres", "postgresql"].includes(protocol)) {
      return url;
    }
    // Caminhos de socket são específicos de servidores Linux. Em desenvolvimento
    // no Windows, o MySQL local deve ser acessado pela porta TCP da própria URL.
    if (process.platform === "win32" && protocol === "mysql") {
      dbUrl.searchParams.delete("socket");
    }
    if (limit > 0 && !dbUrl.searchParams.has("connection_limit")) {
      dbUrl.searchParams.set("connection_limit", String(limit));
    }
    if (poolTimeout > 0 && !dbUrl.searchParams.has("pool_timeout")) {
      dbUrl.searchParams.set("pool_timeout", String(poolTimeout));
    }
    return dbUrl.toString();
  } catch {
    return url;
  }
  return url;
};

const databaseUrl = applyDatabasePoolOptions(
  resolveSqliteUrl(rawEnv.DATABASE_URL),
  rawEnv.DATABASE_POOL_LIMIT,
  rawEnv.DATABASE_POOL_TIMEOUT
);

const ensureDatabaseName = (url: string) => {
  if (url.startsWith("file:")) return;
  try {
    const dbUrl = new URL(url);
    const protocol = dbUrl.protocol.replace(":", "");
    if (!["postgres", "postgresql", "mysql"].includes(protocol)) return;

    const database = (dbUrl.pathname ?? "").replace(/^\/+/, "");
    if (!database) {
      throw new Error(
        "DATABASE_URL precisa incluir o nome do banco na URL. Ex: mysql://user:pass@host:3306/eventos_ipitinga"
      );
    }
  } catch (err) {
    if (err instanceof Error) throw err;
    throw new Error("DATABASE_URL inválida.");
  }
};

ensureDatabaseName(databaseUrl);
process.env.DATABASE_URL = databaseUrl;

export const env = {
  ...rawEnv,
  DATABASE_URL: databaseUrl,
  corsOrigins: rawEnv.CORS_ORIGINS.split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0)
};
