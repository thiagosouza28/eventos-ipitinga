import { promises as fs } from "fs";
import path from "path";

import { chromium, type Browser } from "playwright";

import { AppError } from "../utils/errors";
import type { AdminRegistrationsReportPayload } from "../modules/reports/admin-registrations-report.service";

let browser: Browser | null = null;
const templateCache = new Map<string, string>();
const templatesDir = path.resolve(__dirname, "templates");

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

const loadTemplate = async (fileName: string) => {
  const cached = templateCache.get(fileName);
  if (cached) return cached;
  const templatePath = path.join(templatesDir, fileName);
  const content = await fs.readFile(templatePath, "utf-8");
  templateCache.set(fileName, content);
  return content;
};

const escapeHtml = (value: string | number | null | undefined) => {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo"
});

const DATE_ONLY_REGEX = /^(\d{4})-(\d{2})-(\d{2})/;

const formatDateLabel = (value?: string) => {
  if (!value) return null;
  const trimmed = value.trim();
  const match = trimmed.match(DATE_ONLY_REGEX);
  if (match) {
    return `${match[3]}/${match[2]}/${match[1]}`;
  }
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return trimmed;
  return dateTimeFormatter.format(parsed);
};

const formatPeriod = (start?: string, end?: string) => {
  const startLabel = formatDateLabel(start);
  const endLabel = formatDateLabel(end);
  if (startLabel && endLabel) {
    return `${startLabel} a ${endLabel}`;
  }
  if (startLabel) {
    return `A partir de ${startLabel}`;
  }
  if (endLabel) {
    return `Ate ${endLabel}`;
  }
  return "Todos";
};

const buildFilterCard = (label: string, value: string) => `
  <div class="filter-card">
    <span>${escapeHtml(label)}</span>
    <strong>${escapeHtml(value)}</strong>
  </div>
`;

const buildTotalsList = (items: Array<{ name: string; count: number }>, emptyLabel: string) => {
  if (!items.length) {
    return `<li class="empty">${escapeHtml(emptyLabel)}</li>`;
  }
  return items
    .map(
      (item) => `
      <li>
        <span>${escapeHtml(item.name)}</span>
        <strong>${escapeHtml(item.count)}</strong>
      </li>
    `
    )
    .join("");
};

export const generateAdminRegistrationsReportPdf = async (report: AdminRegistrationsReportPayload) => {
  const htmlTemplate = await loadTemplate("admin-registrations-report.html");

  const filters = report.filters;
  const filtersHtml = [
    buildFilterCard(
      "Distrito",
      filters.districtName || filters.districtId || "Todos"
    ),
    buildFilterCard(
      "Evento",
      filters.eventTitle || filters.eventId || "Todos"
    ),
    buildFilterCard(
      "Lote",
      filters.lotName || filters.lotId || "Todos"
    ),
    buildFilterCard("Periodo", formatPeriod(filters.startDate, filters.endDate))
  ].join("");

  const rowsHtml = report.items.length
    ? report.items
        .map(
          (item) => `
          <tr>
            <td>${escapeHtml(item.districtName)}</td>
            <td>${escapeHtml(item.eventTitle)}</td>
            <td>${escapeHtml(item.lotName)}</td>
            <td class="count">${escapeHtml(item.registrationsCount)}</td>
          </tr>
        `
        )
        .join("")
    : `
        <tr>
          <td colspan="4" class="empty">Nenhum registro encontrado para os filtros informados.</td>
        </tr>
      `;

  const districtTotals = buildTotalsList(
    report.totals.byDistrict.map((item) => ({ name: item.name, count: item.count })),
    "Sem totais por distrito"
  );
  const eventTotals = buildTotalsList(
    report.totals.byEvent.map((item) => ({ name: item.name, count: item.count })),
    "Sem totais por evento"
  );
  const lotTotals = buildTotalsList(
    report.totals.byLot.map((item) => ({ name: item.name, count: item.count })),
    "Sem totais por lote"
  );

  const generatedAt = dateTimeFormatter.format(new Date(report.generatedAt));

  const html = htmlTemplate
    .replaceAll("{{title}}", "Relatorio Administrativo de Inscricoes")
    .replaceAll("{{generatedAt}}", escapeHtml(generatedAt))
    .replaceAll("{{filters}}", filtersHtml)
    .replaceAll("{{rows}}", rowsHtml)
    .replaceAll("{{totalCount}}", escapeHtml(report.totals.total))
    .replaceAll("{{districtTotals}}", districtTotals)
    .replaceAll("{{eventTotals}}", eventTotals)
    .replaceAll("{{lotTotals}}", lotTotals);

  const browserInstance = await ensureBrowser();
  const page = await browserInstance.newPage();
  await page.setContent(html, { waitUntil: "networkidle" });
  const pdfBuffer = await page.pdf({
    format: "A4",
    printBackground: true,
    margin: { top: "14mm", bottom: "16mm", left: "14mm", right: "14mm" }
  });
  await page.close();
  return pdfBuffer;
};
