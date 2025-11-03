import { chromium, Browser } from "playwright";

import { AppError } from "../utils/errors";

let browser: Browser | null = null;

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

export type RegistrationReportParticipant = {
  fullName: string;
  churchName: string;
  districtName: string;
  birthDate: string;
  ageYears: number | null;
  eventTitle: string;
  status: string;
};

export type RegistrationReportGroup = {
  id: string | null;
  title: string;
  subtitle?: string | null;
  extraInfo?: string | null;
  participants: RegistrationReportParticipant[];
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Rascunho",
  PENDING_PAYMENT: "Pendente",
  PAID: "Pago",
  CANCELED: "Cancelada",
  REFUNDED: "Estornada",
  CHECKED_IN: "Check-in realizado",
  OUTROS: "Outros"
};

const formatStatus = (status: string | null | undefined) =>
  status ? STATUS_LABELS[status] ?? status : STATUS_LABELS.OUTROS;

export const generateRegistrationReportPdf = async ({
  groupBy,
  generatedAt,
  groups
}: {
  groupBy: "event" | "church";
  generatedAt: string;
  groups: RegistrationReportGroup[];
}) => {
  const totals = groups.reduce(
    (acc, group) => {
      acc.totalGroups += 1;
      acc.totalParticipants += group.participants.length;
      group.participants.forEach((participant) => {
        const statusKey = formatStatus(participant.status);
        acc.statusCounts[statusKey] = (acc.statusCounts[statusKey] ?? 0) + 1;
      });
      return acc;
    },
    { totalGroups: 0, totalParticipants: 0, statusCounts: {} as Record<string, number> }
  );

  const groupsWithFallback: RegistrationReportGroup[] =
    groups.length > 0
      ? groups
      : [
          {
            id: null,
            title: "Nenhum resultado para os filtros selecionados",
            subtitle: null,
            extraInfo: null,
            participants: []
          }
        ];

  const sectionHtml = groupsWithFallback
    .map((group) => {
      const rows = group.participants
        .map(
          (participant) => `
            <tr>
              <td>${participant.fullName}</td>
              <td>${participant.churchName}</td>
              <td>${participant.districtName}</td>
              <td>${participant.birthDate}</td>
              <td>${participant.ageYears ?? "-"}</td>
              <td>${formatStatus(participant.status)}</td>
              <td>${participant.eventTitle}</td>
            </tr>
          `
        )
        .join("");

      return `
        <section class="group">
          <div class="group-header">
            <h2>${group.title}</h2>
            ${
              group.subtitle
                ? `<p class="subtitle">${group.subtitle}${
                    group.extraInfo ? ` &middot; ${group.extraInfo}` : ""
                  }</p>`
                : group.extraInfo
                ? `<p class="subtitle">${group.extraInfo}</p>`
                : ""
            }
            <p class="meta">Participantes: ${group.participants.length.toString()}</p>
          </div>
          <table class="participants">
            <thead>
              <tr>
                <th>Participante</th>
                <th>Igreja</th>
                <th>Distrito</th>
                <th>Nascimento</th>
                <th>Idade</th>
                <th>Status</th>
                <th>Evento</th>
              </tr>
            </thead>
            <tbody>
              ${rows || `<tr><td colspan="6" class="empty">Nenhum participante encontrado.</td></tr>`}
            </tbody>
          </table>
        </section>
      `;
    })
    .join("");

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <title>RelatÃ³rio de InscriÃ§Ãµes</title>
        <style>
          @page {
            size: A4;
            margin: 18mm 16mm 20mm 16mm;
          }
          * {
            box-sizing: border-box;
            font-family: "Inter", Arial, sans-serif;
          }
          body {
            margin: 0;
            padding: 0;
            background: #f4f4f5;
            color: #18181b;
          }
          .container {
            width: 100%;
          }
          header {
            margin-bottom: 24px;
            padding: 16px 20px;
            background: linear-gradient(135deg, #2563eb 0%, #60a5fa 100%);
            color: white;
            border-radius: 16px;
            box-shadow: 0 16px 30px rgba(37, 99, 235, 0.2);
          }
          header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
          }
          header p {
            margin: 6px 0 0;
            font-size: 13px;
            opacity: 0.9;
          }
          .summary {
            display: flex;
            gap: 16px;
            margin-top: 18px;
            font-size: 12px;
            opacity: 0.85;
            flex-wrap: wrap;
          }
          .summary span {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 6px 10px;
            border-radius: 999px;
            background: rgba(255, 255, 255, 0.16);
          }
          .group {
            margin-bottom: 28px;
            padding: 20px;
            background: white;
            border-radius: 14px;
            box-shadow: 0 12px 24px rgba(15, 23, 42, 0.08);
            page-break-inside: avoid;
          }
          .group-header h2 {
            margin: 0;
            font-size: 18px;
            color: #1f2937;
          }
          .group-header .subtitle {
            margin: 6px 0 0;
            font-size: 13px;
            color: #4b5563;
          }
          .group-header .meta {
            margin: 8px 0 16px;
            font-size: 12px;
            color: #6b7280;
            font-weight: 600;
            letter-spacing: 0.02em;
            text-transform: uppercase;
          }
          table.participants {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
          }
          table.participants thead {
            background: #1f2937;
            color: white;
          }
          table.participants th,
          table.participants td {
            padding: 10px 12px;
            text-align: left;
            border-bottom: 1px solid #e2e8f0;
          }
          table.participants th {
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            font-size: 11px;
          }
          table.participants tbody tr:nth-child(even) {
            background: #f8fafc;
          }
          table.participants tbody tr:hover td {
            background: #eff6ff;
          }
          table.participants td.empty {
            text-align: center;
            font-style: italic;
            color: #6b7280;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <header>
            <h1>RelatÃ³rio de InscriÃ§Ãµes (${groupBy === "event" ? "por Evento" : "por Igreja"})</h1>
            <p>Gerado em ${generatedAt}</p>
            <div class="summary">
              <span>Total de grupos: <strong>${totals.totalGroups}</strong></span>
              <span>Total de participantes: <strong>${totals.totalParticipants}</strong></span>
              ${Object.entries(totals.statusCounts)
                .map(([status, count]) => `<span>${status}: <strong>${count}</strong></span>`)
                .join("")}
            </div>
          </header>
          ${sectionHtml}
        </div>
      </body>
    </html>
  `;

  const browserInstance = await ensureBrowser();
  const page = await browserInstance.newPage();
  await page.setContent(html, { waitUntil: "networkidle" });
  const pdfBuffer = await page.pdf({
    format: "A4",
    printBackground: true,
    margin: { top: "12mm", bottom: "15mm", left: "12mm", right: "12mm" }
  });
  await page.close();
  return pdfBuffer;
};
