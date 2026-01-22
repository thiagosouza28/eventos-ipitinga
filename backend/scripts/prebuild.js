const path = require("path");
const { execSync } = require("child_process");

const rootDir = path.resolve(__dirname, "..");

const run = (command) => execSync(command, { stdio: "inherit", cwd: rootDir });

const databaseUrl = process.env.DATABASE_URL ? process.env.DATABASE_URL.trim() : "";
const skipDeploy = process.env.SKIP_PRISMA_DEPLOY === "1";

run("npm run prisma:generate");

if (!databaseUrl) {
  console.log("[prebuild] DATABASE_URL not set; skipping prisma migrate deploy.");
  process.exit(0);
}

if (skipDeploy) {
  console.log("[prebuild] SKIP_PRISMA_DEPLOY=1; skipping prisma migrate deploy.");
  process.exit(0);
}

run("npm run prisma:deploy");
