import { promises as fs } from "fs";
import path from "path";

import { renderPdfFromHtml } from "./pdf-engine";


const templateCache = new Map<string, string>();
const templatesDir = path.resolve(process.cwd(), "public", "pdf-templates");

const loadTemplate = async (fileName: string) => {
  const cached = templateCache.get(fileName);
  if (cached) return cached;
  const templatePath = path.join(templatesDir, fileName);
  const content = await fs.readFile(templatePath, "utf-8");
  templateCache.set(fileName, content);
  return content;
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL"
});

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "medium"
});

const escapeHtml = (value: string | number | null | undefined) => {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

const formatCurrency = (valueCents: number | null | undefined) =>
  currencyFormatter.format((valueCents ?? 0) / 100);

const card = (label: string, value: string) => `
  <div class="card">
    <h3>${escapeHtml(label)}</h3>
    <p>${escapeHtml(value)}</p>
  </div>
`;

type ExpenseRow = {
  id: string;
  description: string;
  amountCents: number;
  date: Date;
  madeBy: string;
};

export const generateFinancialEventReportPdf = async ({
  generatedAt,
  event,
  totals,
  paidOrdersCount,
  paidRegistrationsCount,
  expenses
}: {
  generatedAt: string;
  event: { id: string; title: string; slug?: string | null };
  totals: {
    grossCents: number;
    feesCents: number;
    netCents: number;
    pix?: { grossCents: number; feesCents: number; netCents: number } | null;
    cashCents?: number | null;
    expensesCents: number;
    generalNetCents?: number | null;
    cashBalanceCents: number;
  };
  paidOrdersCount: number;
  paidRegistrationsCount: number;
  expenses: ExpenseRow[];
}) => {
  const htmlTemplate = await loadTemplate("financial-report.html");
  const pixTotals = totals.pix ?? { grossCents: 0, feesCents: 0, netCents: 0 };
  const cashTotals = totals.cashCents ?? 0;

  const cardsHtml = [
    card("Receita bruta", formatCurrency(totals.grossCents)),
    card("Taxas MP", formatCurrency(pixTotals.feesCents)),
    card("PIX liquido", formatCurrency(pixTotals.netCents)),
    card("Recebido em dinheiro", formatCurrency(cashTotals)),
    card("Despesas", formatCurrency(totals.expensesCents)),
    card("Receita liquida", formatCurrency(totals.netCents)),
    card("Saldo do caixa", formatCurrency(totals.cashBalanceCents)),
    card("Total geral (liquido)", formatCurrency(totals.generalNetCents ?? totals.netCents))
  ].join("");

  const paymentRowsHtml = [
    {
      method: "PIX (Mercado Pago)",
      gross: formatCurrency(pixTotals.grossCents),
      fees: formatCurrency(pixTotals.feesCents),
      net: formatCurrency(pixTotals.netCents)
    },
    {
      method: "Dinheiro",
      gross: formatCurrency(cashTotals),
      fees: formatCurrency(0),
      net: formatCurrency(cashTotals)
    }
  ]
    .map(
      (row) => `
      <tr>
        <td>${escapeHtml(row.method)}</td>
        <td class="amount">${row.gross}</td>
        <td class="amount">${row.fees}</td>
        <td class="amount">${row.net}</td>
      </tr>
    `
    )
    .join("");

  const expenseRowsHtml = expenses.length
    ? expenses
        .map(
          (expense) => `
          <tr>
            <td>${escapeHtml(dateFormatter.format(new Date(expense.date)))}</td>
            <td>${escapeHtml(expense.description)}</td>
            <td>${escapeHtml(expense.madeBy)}</td>
            <td class="amount">${formatCurrency(expense.amountCents)}</td>
          </tr>
        `
        )
        .join("")
    : '<tr><td colspan="4" class="empty">Nenhuma despesa registrada até o momento.</td></tr>';

  const html = htmlTemplate
    .replaceAll("{{title}}", `Relatório financeiro - ${escapeHtml(event.title ?? "Evento")}`)
    .replaceAll(
      "{{subtitle}}",
      `Gerado em ${escapeHtml(generatedAt)}. Pedidos pagos: ${paidOrdersCount} - Inscrições pagas: ${paidRegistrationsCount}`
    )
    .replaceAll("{{eventTitle}}", escapeHtml(event.title ?? "Evento"))
    .replaceAll("{{eventSlug}}", escapeHtml(event.slug ?? "-"))
    .replaceAll("{{paidOrdersCount}}", String(paidOrdersCount))
    .replaceAll("{{paidRegistrationsCount}}", String(paidRegistrationsCount))
    .replaceAll("{{cards}}", cardsHtml)
    .replaceAll("{{paymentRows}}", paymentRowsHtml)
    .replaceAll("{{expenseRows}}", expenseRowsHtml)
    .replaceAll(
      "{{expensesHint}}",
      expenses.length ? "Lista das despesas do evento" : "Nenhuma despesa registrada até o momento"
    )
    .replaceAll("{{generatedAt}}", escapeHtml(generatedAt));

  const pdfBuffer = await renderPdfFromHtml(html, {
    format: "A4",
    printBackground: true,
    margin: { top: "14mm", bottom: "16mm", left: "14mm", right: "14mm" }
  });
  return pdfBuffer;
};
