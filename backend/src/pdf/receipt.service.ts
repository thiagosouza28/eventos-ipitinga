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
  priceCents: number;
  feeCents?: number;
  totalCents?: number;
  lotName?: string;
  participantType?: string;
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
  const validationUrl = `${env.API_URL}/checkin/validate?rid=${payload.registrationId}&sig=${signature}`;
  const qrDataUrl = await QRCode.toDataURL(validationUrl, { errorCorrectionLevel: "H" });
  const photoUrl =
    payload.photoUrl ||
    "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iOTYiIGhlaWdodD0iOTYiIHZpZXdCb3g9IjAgMCA5NiA5NiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8ZGVmcz4KICAgIDxsaW5lYXJHcmFkaWVudCBpZD0iZyIgeDE9IjAlIiB5MT0iMCUiIHgyPSIxMDAlIiB5Mj0iMTAwJSI+CiAgICAgIDxzdG9wIHN0b3AtY29sb3I9IiNkYmVhZmUiIG9mZnNldD0iMCUiIC8+CiAgICAgIDxzdG9wIHN0b3AtY29sb3I9IiNlZWYyZmYiIG9mZnNldD0iMTAwJSIgLz4KICAgIDwvbGluZWFyR3JhZGllbnQ+CiAgICA8ZmlsdGVyIGlkPSJibCIgeD0iLTAlIiB5PSItMCUiIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlclVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+CiAgICAgIDxmZUZsb29kIGZsb29kLW9wYWNpdHk9IjAuMSIgZmxvb2Qtb2Zmc2V0PSIwIi8+CiAgICA8L2ZpbHRlcj4KICA8L2RlZnM+CiAgPHJlY3Qgd2lkdGg9Ijk2IiBoZWlnaHQ9Ijk2IiByeD0iMjAiIGZpbGw9InVybCgjZykiIHN0cm9rZT0iI2Q3ZWFmZSIvPgogIDxyZWN0IHdpZHRoPSI5NiIgaGVpZ2h0PSI5NiIgcng9IjIwIiBmaWxsPSJub25lIiBzdHJva2U9IiNmNGY3ZmYiIHN0cm9rZS13aWR0aD0iMiIvPgogIDxjaXJjbGUgY3g9IjQ4IiBjeT0iMzYiIHI9IjE4IiBmaWxsPSIjZjBmMmZmIiBzdHJva2U9IiM5NGEzYjgiLz4KICA8cGF0aCBkPSJNNzMgODIuN2MwLTMuNy0zLjgtNy4zLTEwLjUtOS41LTYuOS0yLjMtMTYuOS0yLjMtMjMuOCAwQzMyIDc1LjQgMjggNzkgMjggODIuN2MwIDMuNSAzLjQgNi4zIDkuNCA3LjlsLjguMmMxMy4xIDMuNiAzNi4zIDMuNiA0OS41IDBsLjgtMmM2LTQuOCA5LjQtOC4yIDkuNC0xMi4xWiIgZmlsbD0iI2YwZjJmZiIgc3Ryb2tlPSIjOTRhM2I4Ii8+Cjwvc3ZnPg==";

  const formatMoney = (value: number | undefined | null) => {
    const normalized = typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : 0;
    return `R$ ${(normalized / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const amountEvent = formatMoney(payload.priceCents);
  const amountFees = formatMoney(payload.feeCents);
  const totalCents =
    typeof payload.totalCents === "number" && Number.isFinite(payload.totalCents)
      ? payload.totalCents
      : payload.priceCents + (payload.feeCents ?? 0);
  const amountTotal = formatMoney(totalCents);
  const lotName = payload.lotName && payload.lotName.trim() ? payload.lotName : "Lote vigente";
  const participantType = payload.participantType && payload.participantType.trim()
    ? payload.participantType
    : "Inscrição individual";

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
    status: payload.status.toUpperCase(),
    paymentMethod: payload.paymentMethod,
    registrationDate: formatDate(payload.createdAt),
    paymentDate: formatDate(payload.paymentDate),
    photoUrl,
    generatedAt: new Date().toLocaleString("pt-BR"),
    validationUrl,
    qrDataUrl,
    lotName,
    amountTotal,
    amountEvent,
    amountFees,
    participantType
  };

  const compiledHtml = Object.entries(replacements).reduce(
    (acc, [key, value]) => acc.replaceAll(`{{${key}}}`, value),
    htmlTemplate
  );

  const browserInstance = await ensureBrowser();
  const page = await browserInstance.newPage();
  await page.setContent(compiledHtml, { waitUntil: "networkidle" });
  const pdfBuffer = await page.pdf({
    width: "210mm",
    height: "297mm",
    printBackground: true,
    margin: { top: "10mm", bottom: "10mm", left: "10mm", right: "10mm" }
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
