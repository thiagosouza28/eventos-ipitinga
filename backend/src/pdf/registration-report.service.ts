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
// Participante para a ficha de confirmação presencial (uso no evento)
export type EventSheetParticipant = {
  fullName: string;
  birthDate: string; // dd/mm/yyyy
  ageYears: number | null;
  churchName: string;
  districtName: string;
  photoUrl?: string | null;
  eventTitle?: string | null;
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

const escapeHtml = (value: string | number | null | undefined) => {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

const formatCellText = (value: string | number | null | undefined, fallback = "-") =>
  escapeHtml(value === null || value === undefined || value === "" ? fallback : value);

const statusBadgeClass = (status: string) => {
  if (status === STATUS_LABELS.PAID) return "status-paid";
  if (status === STATUS_LABELS.PENDING_PAYMENT) return "status-pending";
  return "status-default";
};

const buildAvatarMarkup = (photoUrl?: string | null) => {
  if (photoUrl && photoUrl.trim().length > 0) {
    return `<div class="avatar photo"><img src="${escapeHtml(photoUrl)}" alt="Foto do participante" /></div>`;
  }
  return `
    <div class="avatar placeholder" aria-label="Avatar padrão">
      <svg viewBox="0 0 64 64" role="img" aria-hidden="true">
        <circle cx="32" cy="24" r="12" fill="none" stroke="currentColor" stroke-width="4"></circle>
        <path
          d="M14 54c4.5-9 12-14 18-14s13.5 5 18 14"
          fill="none"
          stroke="currentColor"
          stroke-width="4"
          stroke-linecap="round"
        ></path>
      </svg>
    </div>
  `;
};

export const generateRegistrationReportPdf = async ({
  groupBy,
  generatedAt,
  groups
}: {
  groupBy: "event" | "church"
  generatedAt: string
  groups: RegistrationReportGroup[]
}) => {
  const totals = groups.reduce(
    (acc, group) => {
      acc.totalGroups += 1
      acc.totalParticipants += group.participants.length
      group.participants.forEach((participant) => {
        const statusKey = formatStatus(participant.status)
        acc.statusCounts[statusKey] = (acc.statusCounts[statusKey] ?? 0) + 1
      })
      return acc
    },
    { totalGroups: 0, totalParticipants: 0, statusCounts: {} as Record<string, number> }
  )

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
        ]

  const pendingCount = totals.statusCounts[STATUS_LABELS.PENDING_PAYMENT] ?? 0
  const paidCount = totals.statusCounts[STATUS_LABELS.PAID] ?? 0
  const highlightStatuses = new Set([STATUS_LABELS.PENDING_PAYMENT, STATUS_LABELS.PAID])

  const summaryCards = [
    { label: "Total de grupos", value: totals.totalGroups },
    { label: "Total de participantes", value: totals.totalParticipants },
    { label: "Pendentes", value: pendingCount, className: "status-pending" },
    { label: "Pagos", value: paidCount, className: "status-paid" }
  ]
    .map(
      (card) => `
        <div class="summary-card ${card.className ?? ""}">
          <span>${card.label}</span>
          <strong>${card.value}</strong>
        </div>
      `
    )
    .join("")

  const extraStatusChips = Object.entries(totals.statusCounts)
    .filter(([status]) => !highlightStatuses.has(status))
    .map(
      ([status, count]) =>
        `<span class="status-chip">${escapeHtml(status)}: <strong>${count.toString()}</strong></span>`
    )
    .join("")

  const sectionHtml = groupsWithFallback
    .map((group) => {
      const subtitlePieces = [group.subtitle, group.extraInfo]
        .filter(Boolean)
        .map((piece) => escapeHtml(piece!))
      const rows = group.participants.length
        ? group.participants
            .map((participant) => {
              const statusLabel = formatStatus(participant.status)
              const age = typeof participant.ageYears === "number" ? participant.ageYears : "-"
              return `
                <tr>
                  <td class="col-participant">
                    <span class="cell-title">${formatCellText(participant.fullName)}</span>
                  </td>
                  <td>${formatCellText(participant.churchName)}</td>
                  <td>${formatCellText(participant.districtName)}</td>
                  <td class="col-birth">${formatCellText(participant.birthDate)}</td>
                  <td class="col-age">${formatCellText(age)}</td>
                  <td class="col-status">
                    <span class="status-badge ${statusBadgeClass(statusLabel)}">${escapeHtml(statusLabel)}</span>
                  </td>
                  <td class="col-event">
                    <span class="event-name">${formatCellText(participant.eventTitle)}</span>
                  </td>
                </tr>
              `
            })
            .join("")
        : '<tr class="empty-row"><td colspan="7" class="empty">Nenhum participante encontrado para este grupo.</td></tr>'

      return `
        <section class="group">
          <header class="group-header">
            <div>
              <p class="group-eyebrow">${groupBy === "event" ? "Evento" : "Igreja"}</p>
              <h2>${formatCellText(group.title)}</h2>
              ${subtitlePieces.length ? `<p class="group-subtitle">${subtitlePieces.join(" &middot; ")}</p>` : ""}
            </div>
            <div class="group-count">
              <span>Participantes</span>
              <strong>${group.participants.length}</strong>
            </div>
          </header>
          <div class="table-wrapper">
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
              <tbody>${rows}</tbody>
            </table>
          </div>
        </section>
      `
    })
    .join("")

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <title>Relatório de Inscrições</title>
        <style>
          @page {
            size: A4;
            margin: 16mm;
          }
          * {
            box-sizing: border-box;
            font-family: "Inter", Arial, sans-serif;
          }
          body {
            margin: 0;
            padding: 32px 24px 40px;
            background: #f5f7fb;
            color: #0f172a;
            -webkit-print-color-adjust: exact;
          }
          .container {
            width: 100%;
            max-width: 960px;
            margin: 0 auto;
          }
          .report-hero {
            padding: 28px;
            border-radius: 22px;
            background: linear-gradient(120deg, #eff6ff 0%, #1d4ed8 100%);
            color: #fff;
            box-shadow: 0 30px 60px rgba(15, 23, 42, 0.25);
            margin-bottom: 28px;
          }
          .report-hero h1 {
            margin: 0;
            font-size: 26px;
            font-weight: 700;
            letter-spacing: 0.02em;
          }
          .report-hero .timestamp {
            margin-top: 6px;
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 0.3em;
            opacity: 0.85;
          }
          .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
            gap: 12px;
            margin-top: 24px;
            font-size: 12px;
          }
          .summary-card {
            padding: 16px;
            border-radius: 18px;
            border: 1px solid rgba(255, 255, 255, 0.4);
            background: rgba(255, 255, 255, 0.18);
            display: flex;
            flex-direction: column;
            gap: 6px;
            backdrop-filter: blur(4px);
            box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.15);
          }
          .summary-card span {
            text-transform: uppercase;
            letter-spacing: 0.15em;
            font-size: 11px;
          }
          .summary-card strong {
            font-size: 28px;
            line-height: 1;
          }
          .summary-card.status-pending strong {
            color: #fde68a;
          }
          .summary-card.status-paid strong {
            color: #a7f3d0;
          }
          .status-chips {
            margin-top: 16px;
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
          }
          .status-chip {
            font-size: 12px;
            border-radius: 999px;
            padding: 6px 12px;
            border: 1px solid rgba(255, 255, 255, 0.3);
            background: rgba(15, 23, 42, 0.2);
            color: #fff;
          }
          .group {
            margin-bottom: 24px;
            padding: 24px 26px;
            background: #ffffff;
            border-radius: 20px;
            box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
            page-break-inside: avoid;
          }
          .group-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 16px;
            padding-bottom: 16px;
            border-bottom: 1px solid #e2e8f0;
          }
          .group-eyebrow {
            text-transform: uppercase;
            letter-spacing: 0.4em;
            font-size: 10px;
            margin: 0 0 8px;
            color: #94a3b8;
          }
          .group-header h2 {
            margin: 0;
            font-size: 20px;
            font-weight: 700;
            color: #0f172a;
          }
          .group-subtitle {
            margin: 6px 0 0;
            font-size: 13px;
            color: #475569;
          }
          .group-count {
            text-align: right;
          }
          .group-count span {
            display: block;
            font-size: 11px;
            letter-spacing: 0.25em;
            color: #94a3b8;
            text-transform: uppercase;
          }
          .group-count strong {
            display: block;
            font-size: 28px;
            color: #2563eb;
            margin-top: 4px;
          }
          .table-wrapper {
            margin-top: 18px;
          }
          table.participants {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0 8px;
            font-size: 12px;
          }
          table.participants thead tr {
            background: #0f172a;
            color: #fff;
          }
          table.participants thead th {
            padding: 10px 12px;
            text-transform: uppercase;
            letter-spacing: 0.32em;
            font-size: 10px;
            font-weight: 600;
            border: none;
          }
          table.participants tbody tr {
            background: #fff;
            box-shadow: 0 8px 18px rgba(15, 23, 42, 0.08);
          }
          table.participants tbody tr:nth-child(even) {
            background: #f8fafc;
          }
          table.participants tbody td {
            padding: 14px 12px;
            border: none;
            vertical-align: middle;
            color: #1f2937;
          }
          table.participants tbody td:first-child {
            border-top-left-radius: 12px;
            border-bottom-left-radius: 12px;
          }
          table.participants tbody td:last-child {
            border-top-right-radius: 12px;
            border-bottom-right-radius: 12px;
          }
          .col-participant {
            font-weight: 600;
            letter-spacing: 0.05em;
            text-transform: uppercase;
          }
          .col-birth,
          .col-age {
            text-align: center;
            font-variant-numeric: tabular-nums;
            color: #0f172a;
          }
          .col-status {
            text-align: center;
          }
          .status-badge {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 4px 10px;
            border-radius: 999px;
            font-size: 11px;
            font-weight: 600;
            letter-spacing: 0.08em;
            text-transform: uppercase;
          }
          .status-badge.status-paid {
            background: #ecfdf5;
            color: #047857;
            border: 1px solid #6ee7b7;
          }
          .status-badge.status-pending {
            background: #fffbeb;
            color: #b45309;
            border: 1px solid #fcd34d;
          }
          .status-badge.status-default {
            background: #e0e7ff;
            color: #3730a3;
            border: 1px solid #c7d2fe;
          }
          .col-event .event-name {
            display: inline-flex;
            padding: 2px 8px;
            border-radius: 999px;
            background: #e0f2fe;
            color: #0369a1;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.1em;
            text-transform: uppercase;
          }
          .empty {
            text-align: center;
            font-style: italic;
            color: #94a3b8;
            padding: 16px;
          }
          table.participants tbody tr.empty-row td {
            background: #f1f5f9 !important;
            box-shadow: none;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <header class="report-hero">
            <h1>Relatório de Inscrições (${groupBy === "event" ? "por Evento" : "por Igreja"})</h1>
            <p class="timestamp">Gerado em ${generatedAt}</p>
            <div class="summary-grid">${summaryCards}</div>
            ${extraStatusChips ? `<div class="status-chips">${extraStatusChips}</div>` : ""}
          </header>
          ${sectionHtml}
        </div>
      </body>
    </html>
  `

  const browserInstance = await ensureBrowser()
  const page = await browserInstance.newPage()
  await page.setContent(html, { waitUntil: "networkidle" })
  const pdfBuffer = await page.pdf({
    format: "A4",
    printBackground: true,
    margin: { top: "16mm", bottom: "16mm", left: "16mm", right: "16mm" }
  })
  await page.close()
  return pdfBuffer
}
// Gera PDF com fichas individuais simplificadas para confirmação presencial no evento
export const generateRegistrationEventSheetPdf = async ({
  generatedAt,
  context,
  participants,
  layout = "single"
}: {
  generatedAt: string
  context?: { title?: string | null; logoUrl?: string | null; footerText?: string | null } | null
  participants: EventSheetParticipant[]
  layout?: "single" | "two" | "four"
}) => {
  const buildCardMarkup = (p: EventSheetParticipant, variant: "default" | "compact") => {
    const minor = typeof p.ageYears === "number" ? p.ageYears < 18 : false
    const avatar = buildAvatarMarkup(p.photoUrl)
    const metaEvent = p.eventTitle
      ? `<div><span class="label">Evento</span><span class="value">${formatCellText(p.eventTitle)}</span></div>`
      : ""
    const ageText = typeof p.ageYears === "number" ? `${p.ageYears} anos` : "-"
    return `
      <article class="card${minor ? " card-minor" : ""}${variant === "compact" ? " card-compact" : ""}">
        <div class="card-head">
          ${avatar}
          <div class="card-info">
            <div class="participant-name">${formatCellText(p.fullName)}</div>
            <div class="participant-meta">
              <div><span class="label">Nascimento</span><span class="value">${formatCellText(p.birthDate)}</span></div>
              <div><span class="label">Idade</span><span class="value">${escapeHtml(ageText)}</span></div>
              <div><span class="label">Igreja</span><span class="value">${formatCellText(p.churchName)}</span></div>
              <div><span class="label">Distrito</span><span class="value">${formatCellText(p.districtName)}</span></div>
              ${metaEvent}
            </div>
          </div>
        </div>
        <section class="terms">
          <h3>Termo de participação</h3>
          <p>
            Declaro estar de acordo com as normas do evento, cuidando da minha segurança e do grupo. Autorizo o uso da minha imagem em materiais institucionais.
          </p>
          ${
            minor
              ? `<p class="minor-alert">Participante menor de idade: a confirmação presencial requer autorização e assinatura do responsável legal.</p>`
              : ""
          }
        </section>
        <section class="signatures">
          <div class="line-group">
            <div class="sign-field">
              <span class="label">Local e data</span>
              <span class="line"></span>
            </div>
            <div class="sign-field">
              <span class="label">Assinatura do participante</span>
              <span class="line"></span>
            </div>
          </div>
          ${
            minor
              ? `<div class="line-group">
                  <div class="sign-field">
                    <span class="label">Nome do responsável</span>
                    <span class="line"></span>
                  </div>
                  <div class="sign-field">
                    <span class="label">Assinatura do responsável</span>
                    <span class="line"></span>
                  </div>
                </div>`
              : ""
          }
        </section>
      </article>
    `
  }

  const participantCards = participants.map((p) =>
    buildCardMarkup(p, layout === "four" ? "compact" : "default")
  )

  const buildChunks = (items: string[], chunkSize: number, layoutClass: string) => {
    const chunks: string[] = []
    for (let i = 0; i < items.length; i += chunkSize) {
      const inner = items.slice(i, i + chunkSize).join("")
      const last = i + chunkSize >= items.length
      chunks.push(
        `<div class="page-chunk" style="${last ? "" : "page-break-after: always;"}"><div class="cards ${layoutClass}">${inner}</div></div>`
      )
    }
    return chunks.join("")
  }

  let bodyHtml = participantCards.join("")
  if (!participantCards.length) {
    bodyHtml = '<div class="empty-state">Nenhum participante encontrado.</div>'
  } else if (layout === "two") {
    bodyHtml = buildChunks(participantCards, 2, "cards cards-two")
  } else if (layout === "four") {
    bodyHtml = buildChunks(participantCards, 4, "cards cards-four")
  }

  const bodyContainer =
    layout === "single" ? `<div class="cards">${bodyHtml}</div>` : bodyHtml

  const headerTitle = context?.title ? escapeHtml(context.title) : "Confirmação Presencial"
  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <title>Confirmação Presencial</title>
        <style>
          @page { size: A4; margin: 16mm; }
          * { box-sizing: border-box; font-family: "Inter", Arial, sans-serif; }
          body { margin: 0; padding: 28px 24px 32px; background: #f3f4f6; color: #0f172a; -webkit-print-color-adjust: exact; }
          .sheet-header {
            background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%);
            color: #fff;
            padding: 22px 28px;
            border-radius: 20px;
            margin-bottom: 20px;
            box-shadow: 0 24px 40px rgba(15, 23, 42, 0.35);
          }
          .sheet-header .eyebrow {
            text-transform: uppercase;
            letter-spacing: 0.35em;
            font-size: 11px;
            margin: 0 0 10px;
            opacity: 0.8;
          }
          .sheet-header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 700;
            letter-spacing: 0.04em;
          }
          .sheet-header p {
            margin: 8px 0 0;
            font-size: 13px;
            opacity: 0.9;
          }
          .cards { display: flex; flex-direction: column; gap: 18px; }
          .cards.cards-two { display: grid; grid-template-columns: 1fr; gap: 18px; }
          .cards.cards-four { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
          .card {
            background: #fff;
            border-radius: 18px;
            padding: 20px 22px;
            border: 1px solid #e2e8f0;
            box-shadow: 0 14px 34px rgba(15, 23, 42, 0.09);
            page-break-inside: avoid;
          }
          .card-head {
            display: grid;
            grid-template-columns: auto 1fr;
            gap: 18px;
            align-items: center;
            margin-bottom: 14px;
          }
          .card-head .avatar {
            width: 92px;
            height: 92px;
            border-radius: 999px;
            border: 4px solid #f1f5f9;
            background: #f8fafc;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
          }
          .card-head .avatar.photo img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            border-radius: 999px;
          }
          .card-head .avatar.placeholder svg {
            width: 46px;
            height: 46px;
            color: #94a3b8;
          }
          .card-compact { padding: 16px 18px; }
          .card-compact .card-head { gap: 12px; grid-template-columns: auto 1fr; }
          .card-compact .card-head .avatar { width: 72px; height: 72px; border-width: 3px; }
          .card-compact .participant-name { font-size: 16px; letter-spacing: 0.05em; }
          .card-compact .participant-meta { grid-template-columns: 1fr; text-align: left; gap: 6px; }
          .card-compact .terms { font-size: 12px; }
          .participant-name {
            font-size: 20px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            margin-bottom: 8px;
          }
          .participant-meta {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
            gap: 8px 12px;
            text-align: right;
          }
          .participant-meta .label {
            display: block;
            font-size: 10px;
            letter-spacing: 0.3em;
            text-transform: uppercase;
            color: #94a3b8;
          }
          .participant-meta .value {
            display: block;
            font-size: 13px;
            font-weight: 600;
            color: #0f172a;
          }
          .terms {
            background: #f9fafb;
            border-radius: 16px;
            padding: 16px 18px;
            border: 1px solid #e5e7eb;
            line-height: 1.6;
            color: #1f2937;
          }
          .terms h3 {
            margin: 0 0 8px;
            font-size: 14px;
            letter-spacing: 0.1em;
            text-transform: uppercase;
            color: #0f172a;
          }
          .terms p {
            margin: 0 0 6px;
            font-size: 12px;
          }
          .terms .minor-alert {
            margin-top: 6px;
            padding: 10px 12px;
            border-radius: 12px;
            background: #fffbeb;
            border: 1px solid #fcd34d;
            color: #92400e;
            font-weight: 600;
          }
          .signatures {
            margin-top: 16px;
          }
          .line-group {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 14px;
            margin-top: 10px;
          }
          .sign-field {
            display: flex;
            flex-direction: column;
            gap: 6px;
          }
          .sign-field .label {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.2em;
            color: #94a3b8;
          }
          .sign-field .line {
            height: 32px;
            border-bottom: 1px dashed #cbd5f5;
            border-radius: 999px;
          }
          .empty-state {
            padding: 24px;
            border-radius: 16px;
            text-align: center;
            color: #94a3b8;
            border: 1px dashed #cbd5f5;
            background: #fff;
          }
          .page-chunk { display: flex; flex-direction: column; gap: 18px; page-break-inside: avoid; }
        </style>
      </head>
      <body>
        <header class="sheet-header">
          <p class="eyebrow">Confirmação Presencial</p>
          <h1>${headerTitle}</h1>
          <p>Gerado em ${generatedAt} &middot; Total de participantes: ${participants.length}</p>
        </header>
        ${bodyContainer}
      </body>
    </html>
  `

  const browserInstance = await ensureBrowser()
  const page = await browserInstance.newPage()
  await page.setContent(html, { waitUntil: "networkidle" })
  const pdfBuffer = await page.pdf({
    format: "A4",
    printBackground: true,
    margin: { top: "16mm", bottom: "16mm", left: "16mm", right: "16mm" }
  })
  await page.close()
  return pdfBuffer
}
