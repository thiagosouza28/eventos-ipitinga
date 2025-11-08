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

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL"
});

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "medium"
});

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
  const toCurrency = (valueCents: number | null | undefined) =>
    currencyFormatter.format((valueCents ?? 0) / 100);

  const pixTotals = totals.pix ?? { grossCents: 0, feesCents: 0, netCents: 0 };
  const cashTotals = totals.cashCents ?? 0;

  const paymentBreakdownRows = [
    {
      method: "PIX (Mercado Pago)",
      gross: toCurrency(pixTotals.grossCents),
      fees: toCurrency(pixTotals.feesCents),
      net: toCurrency(pixTotals.netCents)
    },
    {
      method: "Dinheiro",
      gross: toCurrency(cashTotals),
      fees: toCurrency(0),
      net: toCurrency(cashTotals)
    }
  ];

  const expensesRows = expenses
    .map(
      (expense) => `
        <tr>
          <td>${dateFormatter.format(new Date(expense.date))}</td>
          <td>${expense.description}</td>
          <td>${expense.madeBy}</td>
          <td class="amount">${toCurrency(expense.amountCents)}</td>
        </tr>
      `
    )
    .join("");

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <title>Relatório financeiro - ${event.title}</title>
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
            background: #f9fafb;
            color: #111827;
          }
          header {
            margin-bottom: 24px;
            padding: 16px 20px;
            border-radius: 16px;
            background: linear-gradient(135deg, #0f172a 0%, #1d4ed8 100%);
            color: #fff;
          }
          header h1 {
            margin: 0;
            font-size: 22px;
            font-weight: 600;
          }
          header p {
            margin: 6px 0 0;
            font-size: 13px;
            opacity: 0.9;
          }
          .grid {
            display: grid;
            gap: 12px;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            margin-bottom: 24px;
          }
          .card {
            border-radius: 12px;
            padding: 14px;
            background: #ffffff;
            border: 1px solid #e5e7eb;
            box-shadow: 0 12px 18px rgba(15,23,42,0.08);
          }
          .card h3 {
            margin: 0;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            color: #6b7280;
          }
          .card p {
            margin: 8px 0 0;
            font-size: 18px;
            font-weight: 600;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 24px;
          }
          table thead {
            background: #0f172a;
            color: #fff;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            font-size: 11px;
          }
          table th,
          table td {
            padding: 10px 12px;
            border: 1px solid #e5e7eb;
            font-size: 12px;
          }
          table tbody tr:nth-child(even) {
            background: #f6f8fb;
          }
          .amount {
            text-align: right;
            font-weight: 600;
          }
          .section-title {
            font-size: 15px;
            font-weight: 600;
            margin: 0 0 8px;
            color: #0f172a;
          }
          .muted {
            font-size: 13px;
            color: #6b7280;
            margin-bottom: 16px;
          }
        </style>
      </head>
      <body>
        <header>
          <h1>Relatório Financeiro - ${event.title}</h1>
          <p>Gerado em ${generatedAt}. Pedidos pagos: ${paidOrdersCount} · Inscrições pagas: ${paidRegistrationsCount}</p>
        </header>

        <section>
          <h2 class="section-title">Resumo geral</h2>
          <div class="grid">
            <div class="card">
              <h3>Receita bruta</h3>
              <p>${toCurrency(totals.grossCents)}</p>
            </div>
            <div class="card">
              <h3>Taxas MP</h3>
              <p>${toCurrency(pixTotals.feesCents)}</p>
            </div>
            <div class="card">
              <h3>PIX líquido</h3>
              <p>${toCurrency(pixTotals.netCents)}</p>
            </div>
            <div class="card">
              <h3>Recebido em dinheiro</h3>
              <p>${toCurrency(cashTotals)}</p>
            </div>
            <div class="card">
              <h3>Despesas</h3>
              <p>${toCurrency(totals.expensesCents)}</p>
            </div>
            <div class="card">
              <h3>Receita líquida</h3>
              <p>${toCurrency(totals.netCents)}</p>
            </div>
            <div class="card">
              <h3>Saldo do caixa</h3>
              <p>${toCurrency(totals.cashBalanceCents)}</p>
            </div>
            <div class="card">
              <h3>Total geral (líquido)</h3>
              <p>${toCurrency(totals.generalNetCents ?? totals.netCents)}</p>
            </div>
          </div>
        </section>

        <section>
          <h2 class="section-title">Receita por meio de pagamento</h2>
          <table>
            <thead>
              <tr>
                <th>Método</th>
                <th>Valor bruto</th>
                <th>Taxas</th>
                <th>Valor líquido</th>
              </tr>
            </thead>
            <tbody>
              ${paymentBreakdownRows
                .map(
                  (row) => `
                  <tr>
                    <td>${row.method}</td>
                    <td class="amount">${row.gross}</td>
                    <td class="amount">${row.fees}</td>
                    <td class="amount">${row.net}</td>
                  </tr>
                `
                )
                .join("")}
            </tbody>
          </table>
        </section>

        <section>
          <h2 class="section-title">Despesas registradas</h2>
          <p class="muted">${
            expenses.length
              ? "Lista das despesas vinculadas ao evento"
              : "Nenhuma despesa registrada até o momento"
          }</p>
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Descrição</th>
                <th>Responsável</th>
                <th>Valor</th>
              </tr>
            </thead>
            <tbody>
              ${
                expenses.length
                  ? expensesRows
                  : `<tr><td colspan="4" style="text-align:center; padding:18px; color:#6b7280;">Nenhuma despesa lançada.</td></tr>`
              }
            </tbody>
          </table>
        </section>
      </body>
    </html>
  `;

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
