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

  /*  // Layout opcional: duas fichas por página (empilhadas)
  let bodyHtml = cardsHtml;
  if (layout === "two") {
    const items = participants
      .map((p) => {
        const minor = typeof p.ageYears === "number" ? p.ageYears < 18 : false;
        return `
          <div class=\"card\">
            <div class=\"card-header\">
              ${p.photoUrl ? `<img class=\\\"avatar\\\" src=\\\"${p.photoUrl}\\\" alt=\\\"Foto\\\"/>` : ''}
              <div class=\"ident\">
                <div class=\"name\">${p.fullName}</div>
                <div class=\"meta\">Nascimento: <strong>${p.birthDate}</strong> &middot; Idade: <strong>${p.ageYears ?? "-"}</strong></div>
                <div class=\"meta\">Igreja: <strong>${p.churchName}</strong> &middot; Distrito: <strong>${p.districtName}</strong></div>
                ${p.eventTitle ? `<div class=\\\"meta\\\">Evento: <strong>${p.eventTitle}</strong></div>` : ''}
              </div>
            </div>
            <div class=\"terms\">
              <div class=\"title\">Termo de participação</div>
              <p>
                Declaro, para os devidos fins, que li e estou de acordo com as regras gerais do evento,
                comprometendo-me a segui-las e a zelar pela minha segurança e a dos demais participantes.
                Autorizo, de forma gratuita e por tempo indeterminado, o uso da minha imagem em fotos e vídeos destinados à divulgação institucional do evento.
              </p>
              ${minor ? `<p class=\\\"minor\\\"><strong>Participante menor de 18 anos.</strong> A confirmação presencial requer autorização do responsável legal, que declara ciência e concordância com os termos acima.</p>` : ''}
            </div>
            <div class=\"sign\">
              <div class=\"row\"><div class=\"field\"><label>Local e data</label><div class=\"line\"></div></div><div class=\"field\"><label>Assinatura do participante</label><div class=\"line\"></div></div></div>
              ${minor ? `<div class=\\\"row\\\">\n                   <div class=\\\"field\\\">\n                     <label>Nome do responsável</label>\n                     <div class=\\\"line\\\"></div>\n                   </div>\n                   <div class=\\\"field\\\">\n                     <label>Assinatura do responsável</label>\n                     <div class=\\\"line\\\"></div>\n                   </div>\n                 </div>` : ''}
            </div>
          </div>
        `;
      });
    const chunks: string[] = [];
    for (let i = 0; i < items.length; i += 2) {
      const inner = items.slice(i, i + 2).join("");
      const last = i + 2 >= items.length;
      chunks.push(`<div class=\"page-chunk\" style=\"${last ? '' : 'page-break-after: always;'}\">${inner}</div>`);
    }
    bodyHtml = chunks.join("");
  }

  */  const html = `
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
  layout?: "single" | "two";
}) => {
  const cardsHtml = participants
    .map((p) => {
      const minor = typeof p.ageYears === "number" ? p.ageYears < 18 : false;
      return `
        <div class="card">
          <div class="card-header">
            ${p.photoUrl ? `<img class=\"avatar\" src=\"${p.photoUrl}\" alt=\"Foto\"/>` : ''}
            <div class="ident">
              <div class="name">${p.fullName}</div>
              <div class="meta">Nascimento: <strong>${p.birthDate}</strong> &middot; Idade: <strong>${
                p.ageYears ?? "-"
              }</strong></div>
              <div class="meta">Igreja: <strong>${p.churchName}</strong> &middot; Distrito: <strong>${p.districtName}</strong></div>
              ${p.eventTitle ? `<div class=\"meta\">Evento: <strong>${p.eventTitle}</strong></div>` : ''}
            </div>
          </div>

          <div class="terms">
            <div class="title">Termo de participação</div>
            <p>
              Declaro estar ciente e de acordo com os termos, orientações e regras gerais do evento,
              comprometendo-me a cumpri-las e assumindo responsabilidade pela minha participação.
              Autorizo o uso de minha imagem em registros institucionais.
            </p>
            ${minor
              ? `<p class=\"minor\">Participante menor de 18 anos: a confirmação requer autorização do responsável legal.</p>`
              : ''}
          </div>

          <div class="sign">
            <div class="row">
              <div class="field">
                <label>Local e data</label>
                <div class="line"></div>
              </div>
              <div class="field">
                <label>Assinatura do participante</label>
                <div class="line"></div>
              </div>
            </div>
            ${minor
              ? `<div class=\"row\">\n                   <div class=\"field\">\n                     <label>Nome do responsável</label>\n                     <div class=\"line\"></div>\n                   </div>\n                   <div class=\"field\">\n                     <label>Assinatura do responsável</label>\n                     <div class=\"line\"></div>\n                   </div>\n                 </div>`
              : ''}
          </div>
        </div>
      `;
    })
    .join("");

  // Layout opcional: duas fichas por página (empilhadas)
  let bodyHtml = cardsHtml;
  if (layout === "two") {
    const items = participants
      .map((p) => {
        const minor = typeof p.ageYears === "number" ? p.ageYears < 18 : false;
        return `
          <div class=\"card\">
            <div class=\"card-header\">
              ${p.photoUrl ? `<img class=\\\"avatar\\\" src=\\\"${p.photoUrl}\\\" alt=\\\"Foto\\\"/>` : ''}
              <div class=\"ident\">
                <div class=\"name\">${p.fullName}</div>
                <div class=\"meta\">Nascimento: <strong>${p.birthDate}</strong> &middot; Idade: <strong>${p.ageYears ?? "-"}</strong></div>
                <div class=\"meta\">Igreja: <strong>${p.churchName}</strong> &middot; Distrito: <strong>${p.districtName}</strong></div>
                ${p.eventTitle ? `<div class=\\\"meta\\\">Evento: <strong>${p.eventTitle}</strong></div>` : ''}
              </div>
            </div>
            <div class=\"terms\">
              <div class=\"title\">Termo de participação</div>
              <p>
                Declaro, para os devidos fins, que li e estou de acordo com as regras gerais do evento,
                comprometendo-me a segui-las e a zelar pela minha segurança e a dos demais participantes.
                Autorizo, de forma gratuita e por tempo indeterminado, o uso da minha imagem em fotos e vídeos destinados à divulgação institucional do evento.
              </p>
              ${minor ? `<p class=\\\"minor\\\"><strong>Participante menor de 18 anos.</strong> A confirmação presencial requer autorização do responsável legal, que declara ciência e concordância com os termos acima.</p>` : ''}
            </div>
            <div class=\"sign\">
              <div class=\"row\"><div class=\"field\"><label>Local e data</label><div class=\"line\"></div></div><div class=\"field\"><label>Assinatura do participante</label><div class=\"line\"></div></div></div>
              ${minor ? `<div class=\\\"row\\\">\n                   <div class=\\\"field\\\">\n                     <label>Nome do responsável</label>\n                     <div class=\\\"line\\\"></div>\n                   </div>\n                   <div class=\\\"field\\\">\n                     <label>Assinatura do responsável</label>\n                     <div class=\\\"line\\\"></div>\n                   </div>\n                 </div>` : ''}
            </div>
          </div>
        `;
      });
    const chunks: string[] = [];
    for (let i = 0; i < items.length; i += 2) {
      const inner = items.slice(i, i + 2).join("");
      const last = i + 2 >= items.length;
      chunks.push(`<div class=\"page-chunk\" style=\"${last ? '' : 'page-break-after: always;'}\">${inner}</div>`);
    }
    bodyHtml = chunks.join("");
  }

  const html = `
    <!DOCTYPE html>
    <html lang=\"pt-BR\">
      <head>
        <meta charset=\"UTF-8\" />
        <title>Fichas de Confirmação Presencial</title>
        <style>
          @page { size: A4; margin: 14mm 12mm 22mm 12mm; }
          * { box-sizing: border-box; font-family: \"Inter\", Arial, sans-serif; }
          body { margin: 0; background: #f4f4f5; color: #111827; }
          header { margin-bottom: 16px; padding: 12px 16px; background: #111827; color: #fff; border-radius: 12px; }
          header h1 { margin: 0 0 4px 0; font-size: 18px; font-weight: 600; }
          header p { margin: 0; font-size: 12px; opacity: 0.9; }
          .cards { display: grid; grid-template-columns: 1fr; gap: 12px; }
          .card { background: #fff; border-radius: 12px; padding: 12px; border: 1px solid #e5e7eb; page-break-inside: avoid; }
          .card-header { display: grid; grid-template-columns: auto 1fr; gap: 12px; align-items: center; margin-bottom: 8px; }
          .avatar { width: 72px; height: 72px; object-fit: cover; border-radius: 8px; border: 1px solid #e5e7eb; }
          .ident .name { font-size: 16px; font-weight: 700; color: #111827; }
          .ident .meta { font-size: 12px; color: #374151; margin-top: 2px; }
          .terms { margin-top: 6px; font-size: 12px; color: #1f2937; }
          .terms .title { font-weight: 600; margin-bottom: 4px; }
          .terms .minor { margin-top: 4px; color: #b45309; background: #fffbeb; border: 1px solid #fde68a; padding: 6px 8px; border-radius: 6px; }
          .sign { margin-top: 10px; }
          .sign .row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 10px; }
          .sign .field { display: flex; flex-direction: column; gap: 6px; }
          .sign label { font-size: 11px; color: #6b7280; }
          .sign .line { height: 28px; border-bottom: 1px dashed #9ca3af; }
          .footer { position: fixed; bottom: 0; left: 12mm; right: 12mm; height: 16mm; display: flex; align-items: center; justify-content: space-between; font-size: 11px; color: #6b7280; border-top: 1px solid #e5e7eb; }
          .pageno:after { content: counter(page) " / " counter(pages); }
          .page-chunk { display: grid; grid-template-columns: 1fr; gap: 12px; }
          .page-chunk .card { min-height: 125mm; }
        </style>
      </head>
      <body>
        <header>
          <h1>Confirmação Presencial ${context?.title ? `- ${context.title}` : ''}</h1>
          <p>Gerado em ${generatedAt} &middot; Total de participantes: ${participants.length}</p>
        </header>
        <div class=\"cards\">
          ${bodyHtml || `<div style=\"font-size:12px;color:#6b7280\">Nenhum participante encontrado.</div>`}
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
    margin: { top: "10mm", bottom: "12mm", left: "10mm", right: "10mm" }
  });
  await page.close();
  return pdfBuffer;
};
