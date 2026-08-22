import { existsSync } from "node:fs";
import path from "node:path";

import puppeteer, { type Browser, type PDFOptions } from "puppeteer-core";
import chromium from "@sparticuz/chromium";

import { env } from "../config/env";
import { AppError } from "../utils/errors";

let browser: Browser | null = null;

const isServerlessRuntime = () => {
  const signals = ["VERCEL", "AWS_LAMBDA_FUNCTION_NAME", "AWS_EXECUTION_ENV", "LAMBDA_TASK_ROOT"];
  return signals.some((key) => Boolean(process.env[key]));
};

type BrowserExecutable = {
  executablePath: string;
  bundledChromium: boolean;
};

const resolveExecutablePath = async (): Promise<BrowserExecutable | null> => {
  const configured =
    env.CHROMIUM_EXECUTABLE_PATH?.trim() || env.PLAYWRIGHT_EXECUTABLE_PATH?.trim();
  if (configured) {
    const resolved = path.isAbsolute(configured)
      ? configured
      : path.resolve(process.cwd(), configured);
    if (!existsSync(resolved)) {
      throw new AppError(
        `Chromium não encontrado em ${resolved}. Configure CHROMIUM_EXECUTABLE_PATH.`,
        500
      );
    }
    return { executablePath: resolved, bundledChromium: false };
  }

  if (isServerlessRuntime()) {
    return {
      executablePath: await chromium.executablePath(),
      bundledChromium: true
    };
  }

  const localCandidates =
    process.platform === "win32"
      ? [
          process.env.PROGRAMFILES && path.join(process.env.PROGRAMFILES, "Google", "Chrome", "Application", "chrome.exe"),
          process.env["PROGRAMFILES(X86)"] && path.join(process.env["PROGRAMFILES(X86)"], "Google", "Chrome", "Application", "chrome.exe"),
          process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, "Google", "Chrome", "Application", "chrome.exe"),
          process.env.PROGRAMFILES && path.join(process.env.PROGRAMFILES, "Microsoft", "Edge", "Application", "msedge.exe"),
          process.env["PROGRAMFILES(X86)"] && path.join(process.env["PROGRAMFILES(X86)"], "Microsoft", "Edge", "Application", "msedge.exe")
        ]
      : process.platform === "darwin"
        ? ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"]
        : ["/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser"];

  const installedBrowser = localCandidates.find(
    (candidate): candidate is string => Boolean(candidate && existsSync(candidate))
  );
  if (installedBrowser) {
    return { executablePath: installedBrowser, bundledChromium: false };
  }

  // Hospedagens Node nativas normalmente não incluem Chrome. Nesse caso usamos
  // o Chromium empacotado, sem exigir Docker ou instalação no sistema operacional.
  try {
    const bundledPath = await chromium.executablePath();
    if (bundledPath && existsSync(bundledPath)) {
      return { executablePath: bundledPath, bundledChromium: true };
    }
  } catch {
    // A mensagem orientativa abaixo será retornada se nenhuma opção estiver disponível.
  }

  return null;
};

export const ensurePdfBrowser = async () => {
  if (browser?.connected) return browser;

  const executable = await resolveExecutablePath();
  if (!executable) {
    throw new AppError(
      "Motor de PDF indisponível. Configure CHROMIUM_EXECUTABLE_PATH ou reinstale as dependências do backend para disponibilizar o Chromium incluído.",
      500
    );
  }

  const headlessMode: true | "shell" = executable.bundledChromium ? "shell" : true;

  browser = await puppeteer.launch({
    executablePath: executable.executablePath,
    headless: headlessMode,
    args: executable.bundledChromium
      ? await puppeteer.defaultArgs({ args: chromium.args, headless: headlessMode })
      : ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
  });

  return browser;
};

export const renderPdfFromHtml = async (html: string, options: PDFOptions) => {
  const browserInstance = await ensurePdfBrowser();
  const page = await browserInstance.newPage();
  try {
    await page.setContent(html, { waitUntil: "load" });
    await page.evaluate(() => (globalThis as any).document.fonts?.ready);
    const buffer = await page.pdf(options);
    return buffer;
  } finally {
    await page.close().catch(() => undefined);
  }
};

export const renderPdfAndPngFromHtml = async (html: string, options: PDFOptions) => {
  const browserInstance = await ensurePdfBrowser();
  const page = await browserInstance.newPage();
  try {
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: "load" });
    await page.evaluate(() => (globalThis as any).document.fonts?.ready);
    const pdfBuffer = await page.pdf(options);
    const screenshot = await page.screenshot({
      type: "png",
      fullPage: true,
      omitBackground: false
    });
    return {
      pdfBuffer,
      pngBuffer: Buffer.isBuffer(screenshot) ? screenshot : Buffer.from(screenshot)
    };
  } finally {
    await page.close().catch(() => undefined);
  }
};

export const closePdfBrowser = async () => {
  if (!browser) return;
  await browser.close().catch(() => undefined);
  browser = null;
};
