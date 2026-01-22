const path = require("path");
const { execSync } = require("child_process");
const { existsSync } = require("fs");

const rootDir = path.resolve(__dirname, "..");

const run = (command) => execSync(command, { stdio: "inherit", cwd: rootDir });

const rawArgs = process.argv.slice(2);
const modeArg = rawArgs.find((arg) => arg.startsWith("--mode="));
const modeFromArg = modeArg ? modeArg.split("=")[1] : undefined;
const modeFromEnv = process.env.POSTINSTALL_MODE;
const mode = modeFromArg || modeFromEnv;

const skipPlaywright =
  process.env.SKIP_PLAYWRIGHT_INSTALL === "1" ||
  process.env.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD === "1";

const hasPlaywrightBrowser = () => {
  try {
    const { chromium } = require("playwright");
    const executablePath = chromium.executablePath();
    return Boolean(executablePath && existsSync(executablePath));
  } catch {
    return false;
  }
};

if (!skipPlaywright && !hasPlaywrightBrowser()) {
  try {
    run("npm run playwright:install");
  } catch (error) {
    console.warn("[postinstall] Playwright install skipped due to error.");
  }
} else if (skipPlaywright) {
  console.log("[postinstall] Playwright install skipped by configuration.");
} else {
  console.log("[postinstall] Playwright browser already available.");
}

run("npm run prisma:generate");
