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

const prismaClientSource = resolve(rootDir, "src", "prisma", "generated");
const prismaClientTarget = resolve(rootDir, "dist", "prisma", "generated");
if (existsSync(prismaClientSource)) {
  cpSync(prismaClientSource, prismaClientTarget, { recursive: true });
}

const pdfTemplatesSource = resolve(rootDir, "src", "pdf", "templates");
const pdfTemplatesTarget = resolve(rootDir, "dist", "pdf", "templates");
if (existsSync(pdfTemplatesSource)) {
  cpSync(pdfTemplatesSource, pdfTemplatesTarget, { recursive: true });
}

console.log("OpenAPI exportado, Prisma Client e templates de PDF copiados para dist.");
