const { copyFileSync, cpSync, existsSync, mkdirSync } = require("fs");
const { resolve, dirname } = require("path");

const rootDir = resolve(__dirname, "..");
const openApiSource = resolve(rootDir, "src", "openapi", "openapi.json");
const openApiTargets = [
  resolve(rootDir, "openapi.json"),
  resolve(rootDir, "dist", "openapi.json")
];

openApiTargets.forEach((target) => {
  const targetDir = dirname(target);
  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true });
  }
  copyFileSync(openApiSource, target);
});

const prismaSourceDir = resolve(rootDir, "prisma");
const prismaTargetDir = resolve(rootDir, "dist", "prisma");
if (existsSync(prismaSourceDir)) {
  if (!existsSync(prismaTargetDir)) {
    mkdirSync(prismaTargetDir, { recursive: true });
  }
  const schemaSource = resolve(prismaSourceDir, "schema.prisma");
  if (existsSync(schemaSource)) {
    copyFileSync(schemaSource, resolve(prismaTargetDir, "schema.prisma"));
  }
  const migrationsSource = resolve(prismaSourceDir, "migrations");
  if (existsSync(migrationsSource)) {
    cpSync(migrationsSource, resolve(prismaTargetDir, "migrations"), { recursive: true });
  }
}

const pdfTemplatesSource = resolve(rootDir, "src", "pdf", "templates");
const pdfTemplatesTarget = resolve(rootDir, "dist", "pdf", "templates");
if (existsSync(pdfTemplatesSource)) {
  cpSync(pdfTemplatesSource, pdfTemplatesTarget, { recursive: true });
}

console.log("OpenAPI exportado, schema/migrations do Prisma e templates de PDF copiados para dist.");
