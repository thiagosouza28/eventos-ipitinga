import { promises as fs } from "fs";
import path from "path";

import QRCode from "qrcode";
import { chromium, Browser } from "playwright";

import { env } from "../config/env";
import { AppError } from "../utils/errors";
import { generateCheckinSignature } from "../utils/hmac";
import { maskCpf } from "../utils/mask";

type ReceiptPayload = {
  eventTitle: string;
  eventLocation: string;
  eventPeriod: string;
  fullName: string;
  cpf: string;
  birthDate: string;
  ageYears: number;
  districtName: string;
  churchName: string;
  registrationId: string;
  status: string;
  createdAt: Date;
  paymentMethod: string;
  paymentDate: Date;
  photoUrl: string;
};

let browser: Browser | null = null;
let templateCache: string | null = null;

const brDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  year: "numeric"
});

const formatDate = (date: Date) => brDateFormatter.format(date);

const ensureBrowser = async () => {
  if (browser) return browser;
  try {
    browser = await chromium.launch({ headless: true });
    return browser;
  } catch (error: any) {
    browser = null;
    const message = String(error?.message ?? "");
    if (message.includes("executable doesn't exist") || message.includes("Failed to launch")) {
      throw new AppError(
        "Motor de PDF indisponivel. Execute `npm run playwright:install` e tente novamente.",
        500
      );
    }
    throw error;
  }
};

const loadReceiptTemplate = async () => {
  const shouldBypassCache = env.NODE_ENV !== "production";
  if (!shouldBypassCache && templateCache) return templateCache;

  const templatePath = path.resolve(__dirname, "templates", "receipt.html");
  try {
    const template = await fs.readFile(templatePath, "utf-8");
    if (!shouldBypassCache) {
      templateCache = template;
    }
    return template;
  } catch (error: any) {
    if (error && error.code === "ENOENT") {
      throw new AppError(
        "Template do recibo nao encontrado. Execute o build novamente ou reinstale a aplicacao.",
        500
      );
    }
    throw error;
  }
};

export const generateReceiptPdf = async (payload: ReceiptPayload) => {
  const htmlTemplate = await loadReceiptTemplate();

  const signature = generateCheckinSignature(payload.registrationId, payload.createdAt);
  const validationUrl = `${env.APP_URL}/checkin/validate?rid=${payload.registrationId}&sig=${signature}`;
  const qrDataUrl = await QRCode.toDataURL(validationUrl, { errorCorrectionLevel: "H" });

  const replacements: Record<string, string> = {
    eventTitle: payload.eventTitle,
    eventLocation: payload.eventLocation,
    eventPeriod: payload.eventPeriod,
    fullName: payload.fullName,
    cpf: maskCpf(payload.cpf),
    birthDate: payload.birthDate,
    ageYears: String(payload.ageYears),
    districtName: payload.districtName,
    churchName: payload.churchName,
    registrationId: payload.registrationId,
    status: payload.status,
  paymentMethod: payload.paymentMethod,
  registrationDate: formatDate(payload.createdAt),
  paymentDate: formatDate(payload.paymentDate),
  photoUrl: payload.photoUrl,
    generatedAt: new Date().toLocaleString("pt-BR"),
    validationUrl,
    qrDataUrl
  };

  const compiledHtml = Object.entries(replacements).reduce(
    (acc, [key, value]) => acc.replaceAll(`{{${key}}}`, value),
    htmlTemplate
  );

  const browserInstance = await ensureBrowser();
  const page = await browserInstance.newPage();
  await page.setContent(compiledHtml, { waitUntil: "networkidle" });
  const pdfBuffer = await page.pdf({
    width: "105mm",
    height: "148mm",
    printBackground: true,
    margin: { top: "6mm", bottom: "6mm", left: "6mm", right: "6mm" }
  });
  await page.close();
  return { pdfBuffer, validationUrl };
};

export const closeReceiptBrowser = async () => {
  if (browser) {
    await browser.close();
    browser = null;
  }
};
