import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const prismaCli = path.join(backendRoot, "node_modules", "prisma", "build", "index.js");
const schema = path.join(backendRoot, "prisma", "schema.prisma");
const args = process.argv.slice(2);

if (!args.length) {
  console.error("Uso: node scripts/prisma-cli.mjs <comando Prisma>");
  process.exit(2);
}

const isMigrationDeploy = args[0] === "migrate" && args[1] === "deploy";
const env = { ...process.env };

// Alguns provedores cPanel usam MariaDB via socket/Galera e podem bloquear
// indefinidamente no advisory lock. A desativação é limitada ao deploy e
// pode ser desligada definindo PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK=0.
if (isMigrationDeploy && env.PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK === undefined) {
  env.PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK = "1";
}

const result = spawnSync(process.execPath, [prismaCli, ...args, "--schema", schema], {
  cwd: backendRoot,
  env,
  stdio: "inherit"
});

if (result.error) {
  console.error("Não foi possível iniciar o Prisma CLI:", result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
