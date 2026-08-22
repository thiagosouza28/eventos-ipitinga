import { promises as fs, existsSync } from "fs";
import path from "path";

import QRCode from "qrcode";

import { env } from "../config/env";
import { AppError } from "../utils/errors";
import { generateCheckinSignature } from "../utils/hmac";
import { maskCpf } from "../utils/mask";
import { closePdfBrowser, renderPdfAndPngFromHtml } from "./pdf-engine";
import { getPublicApiBaseUrl } from "../utils/public-url";
import { DEFAULT_PHOTO_DATA_URL } from "../config/default-photo";

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

let templateCache: string | null = null;
const receiptConcurrency = Math.max(1, env.RECEIPT_MAX_CONCURRENCY);
const backendRoot = path.resolve(process.cwd());

const createLimiter = (maxConcurrent: number) => {
  let active = 0;
  const queue: Array<() => void> = [];

  const runNext = () => {
    if (active >= maxConcurrent) return;
    const next = queue.shift();
    if (next) next();
  };

  return async <T>(task: () => Promise<T>): Promise<T> =>
    new Promise<T>((resolve, reject) => {
      const run = () => {
        active += 1;
        task()
          .then(resolve)
          .catch(reject)
          .finally(() => {
            active = Math.max(0, active - 1);
            runNext();
          });
      };
      queue.push(run);
      runNext();
    });
};

const receiptLimiter = createLimiter(receiptConcurrency);

const brDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  year: "numeric"
});

const formatDate = (date: Date) => brDateFormatter.format(date);

const resolveTemplatePath = () => {
  const candidates = [
    path.resolve(__dirname, "templates", "receipt.html"),
    path.resolve(backendRoot, "dist", "pdf", "templates", "receipt.html"),
    path.resolve(backendRoot, "public", "pdf-templates", "receipt.html")
  ];
  return candidates.find((candidate) => existsSync(candidate)) ?? candidates[0];
};

// Browser lifecycle is handled by pdf-engine (serverless friendly).

const loadReceiptTemplate = async () => {
  const shouldBypassCache = env.NODE_ENV !== "production";
  if (!shouldBypassCache && templateCache) return templateCache;

  const templatePath = resolveTemplatePath();
  try {
    const template = await fs.readFile(templatePath, "utf-8");
    if (!shouldBypassCache) {
      templateCache = template;
    }
    return template;
  } catch (error: any) {
    if (error && error.code === "ENOENT") {
      throw new AppError(
        "Template do recibo não encontrado. Execute o build novamente ou reinstale a aplicação.",
        500
      );
    }
    throw error;
  }
};

export const generateReceiptPdf = async (payload: ReceiptPayload) => {
  return receiptLimiter(async () => {
    const htmlTemplate = await loadReceiptTemplate();

    const signature = generateCheckinSignature(payload.registrationId, payload.createdAt);
    const validationUrl = `${getPublicApiBaseUrl()}/checkin/validate?rid=${encodeURIComponent(payload.registrationId)}&sig=${encodeURIComponent(signature)}`;
    const qrDataUrl = await QRCode.toDataURL(validationUrl, { errorCorrectionLevel: "H" });
    const photoUrl = payload.photoUrl?.trim() || DEFAULT_PHOTO_DATA_URL;

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
      defaultPhotoUrl: DEFAULT_PHOTO_DATA_URL,
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

    const { pdfBuffer, pngBuffer } = await renderPdfAndPngFromHtml(compiledHtml, {
      width: "210mm",
      height: "297mm",
      printBackground: true,
      margin: { top: "0", bottom: "0", left: "0", right: "0" }
    });

    return { pdfBuffer, pngBuffer, validationUrl };
  });
};

export const closeReceiptBrowser = async () => {
  await closePdfBrowser();
};


