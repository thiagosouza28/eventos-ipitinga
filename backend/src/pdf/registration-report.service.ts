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
        "Motor de PDF indisponível. Execute `npm run playwright:install` e tente novamente.",
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
  if (value === null || value === undefined) return "";
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
  if (status === STATUS_LABELS.PAID || status === STATUS_LABELS.CHECKED_IN) return "status-paid";
  if (status === STATUS_LABELS.PENDING_PAYMENT) return "status-pending";
  if (status === STATUS_LABELS.REFUNDED) return "status-refunded";
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

  const pendingCount = totals.statusCounts[STATUS_LABELS.PENDING_PAYMENT] ?? 0;
  const paidCount = totals.statusCounts[STATUS_LABELS.PAID] ?? 0;
  const refundedCount = totals.statusCounts[STATUS_LABELS.REFUNDED] ?? 0;
  const highlightStatuses = new Set([STATUS_LABELS.PENDING_PAYMENT, STATUS_LABELS.PAID]);

  const summaryCards = [
    { label: "Total de grupos", value: totals.totalGroups },
    { label: "Total de participantes", value: totals.totalParticipants },
    { label: "Pendentes", value: pendingCount, className: "status-pending" },
    { label: "Pagos", value: paidCount, className: "status-paid" },
    { label: "Estornados", value: refundedCount, className: "status-refunded" }
  ]
    .filter((card) => card.value !== undefined)
    .map(
      (card) => `
        <div class="summary-card ${card.className ?? ""}">
          <span>${card.label}</span>
          <strong>${card.value}</strong>
        </div>
      `
    )
    .join("");

  const extraStatusChips = Object.entries(totals.statusCounts)
    .filter(([status]) => !highlightStatuses.has(status))
    .map(
      ([status, count]) =>
        `<span class="status-chip">${escapeHtml(status)}: <strong>${count.toString()}</strong></span>`
    )
    .join("");

  const firstGroup = groupsWithFallback[0];
  const metaCards = [
    { label: "Evento/Igreja", value: firstGroup?.title ?? "Não informado" },
    { label: "Período", value: firstGroup?.subtitle ?? "Não informado" },
    { label: "Local / Extra", value: firstGroup?.extraInfo ?? "Não informado" },
    { label: "Gerado em", value: generatedAt }
  ]
    .map(
      (item) => `
      <div class="meta-card">
        <span class="label">${escapeHtml(item.label)}</span>
        <span class="value">${escapeHtml(item.value)}</span>
      </div>
    `
    )
    .join("");

  const sectionHtml = groupsWithFallback
    .map((group) => {
      const subtitlePieces = [group.subtitle, group.extraInfo].filter(Boolean).map((piece) => escapeHtml(piece!));
      const rows = group.participants.length
        ? group.participants
            .map((participant) => {
              const statusLabel = formatStatus(participant.status);
              const age = typeof participant.ageYears === "number" ? participant.ageYears : "-";
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
                </tr>
              `;
            })
            .join("")
        : '<tr class="empty-row"><td colspan="6" class="empty">Nenhum participante encontrado para este grupo.</td></tr>';

      return `
        <section class="group">
          <div class="group-head">
            <div>
              <p class="eyebrow">${groupBy === "event" ? "Evento" : "Igreja"}</p>
              <h2>${formatCellText(group.title)}</h2>
              ${subtitlePieces.length ? `<p class="subtitle">${subtitlePieces.join(" · ")}</p>` : ""}
            </div>
            <div class="chips">
              ${group.participants.length ? `<span class="chip">Total: ${group.participants.length}</span>` : ""}
            </div>
          </div>
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
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </section>
      `;
    })
    .join("");

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <title>Relatório Oficial de Inscrições</title>
        <style>
          @page { size: A4; margin: 18mm 12mm 16mm 12mm; }
          * { box-sizing: border-box; font-family: "Inter", Arial, sans-serif; }
          body { margin: 0; padding: 0; background: #f7f8fb; color: #0f172a; -webkit-print-color-adjust: exact; }
          header.site-header {
            padding: 14px 18px;
            background: linear-gradient(135deg, #0b1220 0%, #1d4ed8 100%);
            color: #fff;
            border-radius: 14px 14px 0 0;
          }
          header .title { margin: 2px 0 0; font-size: 22px; font-weight: 800; letter-spacing: 0.02em; }
          header .subtitle { margin: 4px 0 0; font-size: 13px; opacity: 0.9; }
          .eyebrow { letter-spacing: 0.32em; text-transform: uppercase; font-size: 10px; color: #cbd5f5; margin: 0; }
          footer.site-footer {
            text-align: center;
            padding: 8px 0;
            color: #475569; font-size: 11px;
          }
          main { padding: 0; margin: 0; }
          .page { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 0 0 14px 14px; overflow: hidden; }
          .bar-meta {
            display: flex; flex-wrap: wrap; gap: 10px;
            padding: 10px 18px;
            border-bottom: 1px solid #e2e8f0;
            background: #f8fafc;
            font-size: 12px;
          }
          .bar-meta span { color: #475569; }
          .bar-meta .label { text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700; color: #0f172a; margin-right: 6px; }
          .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
            gap: 8px;
            padding: 10px 18px 6px;
          }
          .summary-card { padding: 10px 12px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; }
          .summary-card span { display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: #64748b; margin-bottom: 4px; }
          .summary-card strong { font-size: 18px; color: #0f172a; }
          .summary-card.status-pending strong { color: #b45309; }
          .summary-card.status-paid strong { color: #15803d; }
          .summary-card.status-refunded strong { color: #0f172a; }
          .table-wrapper { padding: 0 0 12px; }
          table.participants { width: 100%; border-collapse: collapse; font-size: 12px; }
          table.participants thead { background: #0f172a; color: #fff; }
          table.participants thead th { padding: 9px 10px; text-transform: uppercase; letter-spacing: 0.16em; font-size: 10.5px; font-weight: 700; }
          table.participants tbody tr:nth-child(even) { background: #f8fafc; }
          table.participants tbody tr:nth-child(odd) { background: #ffffff; }
          table.participants tbody td { padding: 11px 10px; color: #1f2937; }
          .col-birth, .col-age { text-align: center; font-variant-numeric: tabular-nums; }
          .col-status { text-align: center; }
          .status-badge { display: inline-flex; align-items: center; justify-content: center; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; border: 1px solid transparent; }
          .status-badge.status-paid { background: #ecfdf5; color: #047857; border-color: #6ee7b7; }
          .status-badge.status-pending { background: #fffbeb; color: #b45309; border-color: #fcd34d; }
          .status-badge.status-refunded { background: #e2e8f0; color: #0f172a; border-color: #cbd5e1; }
          .status-badge.status-default { background: #e0e7ff; color: #3730a3; border-color: #c7d2fe; }
          .empty { text-align: center; font-style: italic; color: #94a3b8; padding: 16px; }
          table.participants tbody tr.empty-row td { background: #f1f5f9 !important; }
        </style>
      </head>
      <body>
        <div class="page">
          <header class="site-header">
            <p class="eyebrow">${groupBy === "event" ? "RELATÓRIO OFICIAL DE INSCRIÇÕES POR EVENTO" : "RELATÓRIO OFICIAL DE INSCRIÇÕES POR IGREJA"}</p>
            <h1 class="title">Relatório Oficial de Inscrições</h1>
            <p class="subtitle">Total: ${totals.totalParticipants} participantes · ${totals.totalGroups} grupos · Gerado em ${generatedAt}</p>
          </header>

          <div class="bar-meta">
            <span><span class="label">Evento/Igreja:</span>${escapeHtml(firstGroup?.title ?? "Não informado")}</span>
            <span><span class="label">Período:</span>${escapeHtml(firstGroup?.subtitle ?? "Não informado")}</span>
            <span><span class="label">Local/Extra:</span>${escapeHtml(firstGroup?.extraInfo ?? "Não informado")}</span>
          </div>

          <div class="summary">${summaryCards}</div>
          ${extraStatusChips ? `<div class="chips" style="padding:0 18px 10px;">${extraStatusChips}</div>` : ""}

          <div class="table-wrapper">
            ${sectionHtml}
          </div>

          <footer class="site-footer">
            Documento gerado automaticamente pelo sistema · ${generatedAt}
          </footer>
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
    margin: { top: "12mm", bottom: "18mm", left: "10mm", right: "10mm" }
  });
  await page.close();
  return pdfBuffer;
};

// Gera PDF com fichas individuais simplificadas para confirmação presencial no evento
export const generateRegistrationEventSheetPdf = async ({
  generatedAt,
  context,
  participants,
  layout = "single"
}: {
  generatedAt: string;
  context?: { title?: string | null; logoUrl?: string | null; footerText?: string | null } | null;
  participants: EventSheetParticipant[];
  layout?: "single" | "two" | "four";
}) => {
  const buildCardMarkup = (p: EventSheetParticipant, variant: "default" | "compact") => {
    const minor = typeof p.ageYears === "number" ? p.ageYears < 18 : false;
    const avatar = buildAvatarMarkup(p.photoUrl);
    const metaEvent = p.eventTitle
      ? `<div><span class="label">Evento</span><span class="value">${formatCellText(p.eventTitle)}</span></div>`
      : "";
    const ageText = typeof p.ageYears === "number" ? `${p.ageYears} anos` : "-";
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
    `;
  };

  const participantCards = participants.map((p) =>
    buildCardMarkup(p, layout === "four" ? "compact" : "default")
  );

  const buildChunks = (items: string[], chunkSize: number, layoutClass: string) => {
    const chunks: string[] = [];
    for (let i = 0; i < items.length; i += chunkSize) {
      const inner = items.slice(i, i + chunkSize).join("");
      const last = i + chunkSize >= items.length;
      chunks.push(
        `<div class="page-chunk" style="${last ? "" : "page-break-after: always;"}"><div class="cards ${layoutClass}">${inner}</div></div>`
      );
    }
    return chunks.join("");
  };

  let bodyHtml = participantCards.join("");
  if (!participantCards.length) {
    bodyHtml = '<div class="empty-state">Nenhum participante encontrado.</div>';
  } else if (layout === "two") {
    bodyHtml = buildChunks(participantCards, 2, "cards cards-two");
  } else if (layout === "four") {
    bodyHtml = buildChunks(participantCards, 4, "cards cards-four");
  }

  const bodyContainer = layout === "single" ? `<div class="cards">${bodyHtml}</div>` : bodyHtml;

  const headerTitle = context?.title ? escapeHtml(context.title) : "Confirmação Presencial";
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
          .sheet-header h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 0.04em; }
          .sheet-header p { margin: 8px 0 0; font-size: 13px; opacity: 0.9; }
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
            display: grid; grid-template-columns: auto 1fr; gap: 18px; align-items: center; margin-bottom: 14px;
          }
          .card-head .avatar { width: 92px; height: 92px; border-radius: 999px; border: 4px solid #f1f5f9; background: #f8fafc; display: flex; align-items: center; justify-content: center; overflow: hidden; }
          .card-head .avatar.photo img { width: 100%; height: 100%; object-fit: cover; border-radius: 999px; }
          .card-head .avatar.placeholder svg { width: 46px; height: 46px; color: #94a3b8; }
          .card-compact { padding: 16px 18px; }
          .card-compact .card-head { gap: 12px; grid-template-columns: auto 1fr; }
          .card-compact .card-head .avatar { width: 72px; height: 72px; border-width: 3px; }
          .card-compact .participant-name { font-size: 16px; letter-spacing: 0.05em; }
          .card-compact .participant-meta { grid-template-columns: 1fr; text-align: left; gap: 6px; }
          .card-compact .terms { font-size: 12px; }
          .participant-name { font-size: 20px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px; }
          .participant-meta { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 8px 12px; text-align: right; }
          .participant-meta .label { display: block; font-size: 10px; letter-spacing: 0.3em; text-transform: uppercase; color: #94a3b8; }
          .participant-meta .value { display: block; font-size: 13px; font-weight: 600; color: #0f172a; }
          .terms { background: #f9fafb; border-radius: 16px; padding: 16px 18px; border: 1px solid #e5e7eb; line-height: 1.6; color: #1f2937; }
          .terms h3 { margin: 0 0 8px; font-size: 14px; letter-spacing: 0.1em; text-transform: uppercase; color: #0f172a; }
          .terms p { margin: 0 0 6px; font-size: 12px; }
          .terms .minor-alert { margin-top: 6px; padding: 10px 12px; border-radius: 12px; background: #fffbeb; border: 1px solid #fcd34d; color: #92400e; font-weight: 600; }
          .signatures { margin-top: 16px; }
          .line-group { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; margin-top: 10px; }
          .sign-field { display: flex; flex-direction: column; gap: 6px; }
          .sign-field .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.2em; color: #94a3b8; }
          .sign-field .line { height: 32px; border-bottom: 1px dashed #cbd5f5; border-radius: 999px; }
          .empty-state { padding: 24px; border-radius: 16px; text-align: center; color: #94a3b8; border: 1px dashed #cbd5f5; background: #fff; }
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
  `;

  const browserInstance = await ensureBrowser();
  const page = await browserInstance.newPage();
  await page.setContent(html, { waitUntil: "networkidle" });
  const pdfBuffer = await page.pdf({
    format: "A4",
    printBackground: true,
    margin: { top: "16mm", bottom: "16mm", left: "16mm", right: "16mm" }
  });
  await page.close();
  return pdfBuffer;
};


