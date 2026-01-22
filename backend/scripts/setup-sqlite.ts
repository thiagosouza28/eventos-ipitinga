import "dotenv/config";
import "../src/config/env";
import fs from "fs";
import path from "path";

import { prisma } from "../src/lib/prisma";

const resolvePrismaDir = () => {
  const fallback = path.resolve(__dirname, "..", "prisma");
  try {
    const pkgPath = path.resolve(__dirname, "..", "package.json");
    const raw = fs.readFileSync(pkgPath, "utf-8");
    const pkg = JSON.parse(raw) as { prisma?: { schema?: string } };
    const schemaPath = pkg?.prisma?.schema;
    if (schemaPath) {
      return path.resolve(__dirname, "..", path.dirname(schemaPath));
    }
  } catch {
    // ignore and use fallback
  }
  return fallback;
};

const prismaDir = resolvePrismaDir();
const migrationFile = path.resolve(prismaDir, "migrations", "0001_init", "migration.sql");

const sql = fs
  .readFileSync(migrationFile, "utf-8")
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => line.length && !line.startsWith("--"))
  .join(" ");

const statements = sql
  .split(/;\s*/)
  .map((statement) => statement.trim())
  .filter((statement) => statement.length);

async function main() {
  for (const statement of statements) {
    await prisma.$executeRawUnsafe(statement);
  }
}

main()
  .then(() => {
    console.log("SQLite schema created successfully.");
  })
  .catch((error) => {
    console.error("Failed to create SQLite schema:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
