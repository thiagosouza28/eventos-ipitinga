import { config } from "dotenv";
import path from "path";
import { z } from "zod";

config();

const isTestRuntime =
  process.env.NODE_ENV === "test" || typeof process.env.JEST_WORKER_ID !== "undefined";

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
  PORT: z.coerce.number().default(3000),
  APP_URL: z.string().url(),
  API_URL: z.string().url(),
  DATABASE_URL: z.string().min(1),
  DATABASE_POOL_LIMIT: z.coerce.number().int().positive().default(20),
  DATABASE_POOL_TIMEOUT: z.coerce.number().int().positive().default(10),
  JWT_SECRET: z.string().min(32, "JWT_SECRET deve possuir ao menos 32 caracteres"),
  JWT_EXPIRES_IN: z.string().default("30d"),
  PASSWORD_SALT_ROUNDS: z.coerce.number().default(10),
  STORAGE_DRIVER: z.enum(["supabase", "s3", "in-memory"]).default("in-memory"),
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
  CORS_ORIGINS: z.string().default("http://localhost:5173"),
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
  ADMIN_EMAIL: z.string().email(),
  ADMIN_PASSWORD: z.string().min(8),
  CHECKIN_CONFIRM_PASSWORD: z.string().min(4).optional(),
  SMTP_HOST: z.string().default("smtp.gmail.com"),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().email("SMTP_USER deve ser um e-mail válido"),
  SMTP_PASS: z.string().min(1, "SMTP_PASS não pode ser vazio"),
  EMAIL_FROM: z.string().email("EMAIL_FROM deve ser um e-mail válido")
});

const parsed = envSchema.safeParse({ ...testDefaults, ...process.env });

if (!parsed.success) {
  console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid configuration. Check the .env file.");
}

const rawEnv = parsed.data;

const ensureHttpsUrl = (label: string, url: string) => {
  if (!url.toLowerCase().startsWith("https://")) {
    throw new Error(`${label} deve usar HTTPS quando o ambiente estiver em produção.`);
  }
};

if (rawEnv.NODE_ENV === "production") {
  ensureHttpsUrl("APP_URL", rawEnv.APP_URL);
  ensureHttpsUrl("API_URL", rawEnv.API_URL);
}

const resolveSqliteUrl = (url: string) => {
  if (!url.startsWith("file:")) return url;
  const [pathPart, queryPart] = url.slice("file:".length).split("?");
  const absolutePath = path.isAbsolute(pathPart)
    ? pathPart
    : path.resolve(process.cwd(), pathPart);
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
process.env.DATABASE_URL = databaseUrl;

export const env = {
  ...rawEnv,
  DATABASE_URL: databaseUrl,
  corsOrigins: rawEnv.CORS_ORIGINS.split(",").map((origin) => origin.trim())
};
