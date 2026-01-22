const path = require("path");
const { existsSync } = require("fs");

const rootDir = path.resolve(__dirname, "..");
const errors = [];
const warnings = [];

const schemaPath = path.resolve(rootDir, "prisma", "schema.prisma");
if (!existsSync(schemaPath)) {
  errors.push(`Missing schema at ${schemaPath}`);
}

const distMainPath = path.resolve(rootDir, "dist", "main.js");
if (!existsSync(distMainPath)) {
  errors.push(`Missing build output at ${distMainPath}`);
}

const distSchemaPath = path.resolve(rootDir, "dist", "prisma", "schema.prisma");
if (!existsSync(distSchemaPath)) {
  warnings.push(`Missing dist schema at ${distSchemaPath}`);
}

const databaseUrl = process.env.DATABASE_URL ? process.env.DATABASE_URL.trim() : "";
if (!databaseUrl) {
  errors.push("DATABASE_URL is not set.");
}

const port = process.env.PORT ? process.env.PORT.trim() : "";
if (!port) {
  const isProd = process.env.NODE_ENV === "production";
  const message = "PORT is not set. Default 3000 will be used.";
  if (isProd) {
    errors.push(message);
  } else {
    warnings.push(message);
  }
}

if (warnings.length) {
  console.warn("[doctor] Warnings:");
  warnings.forEach((warning) => console.warn(`- ${warning}`));
}

if (errors.length) {
  console.error("[doctor] Errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("[doctor] OK");
