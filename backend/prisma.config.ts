import { defineConfig } from "prisma/config";
import { config as loadDotenv } from "dotenv";
import { existsSync } from "node:fs";
import path from "node:path";

// Prisma CLI skips automatic `.env` loading when a Prisma config is present.
// We keep the old DX by loading `.env` (or `backend/.env` fallback) ourselves.
const projectRoot = path.resolve(process.cwd());
const rootEnv = path.resolve(projectRoot, ".env");
const backendEnv = path.resolve(projectRoot, "backend", ".env");
const envPath = existsSync(rootEnv) ? rootEnv : existsSync(backendEnv) ? backendEnv : rootEnv;
loadDotenv({ path: envPath, quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  seed: "node prisma/seed.mjs"
});
