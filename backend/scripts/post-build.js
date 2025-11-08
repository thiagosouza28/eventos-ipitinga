const { copyFileSync, existsSync, mkdirSync } = require("fs");
const { resolve, dirname } = require("path");

const rootDir = resolve(__dirname, "..");
const openApiSource = resolve(rootDir, "src", "openapi", "openapi.json");
const targets = [
  resolve(rootDir, "openapi.json"),
  resolve(rootDir, "dist", "openapi.json")
];

targets.forEach((target) => {
  const targetDir = dirname(target);
  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true });
  }
  copyFileSync(openApiSource, target);
});

console.log("OpenAPI JSON exportado para dist e diretório raiz.");
