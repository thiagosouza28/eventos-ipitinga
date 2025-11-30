/**
 * Calcula as taxas do Mercado Pago baseado no objeto de pagamento.
 * As informacoes podem aparecer em transaction_details.*, fee_details ou fee_details no topo.
 *
 * Taxa padrao utilizada como fallback: 0,94% para pagamentos via PIX.
 */
const MERCADO_PAGO_FEE_PERCENTAGE = 0.0094; // 0,94%

const toCents = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  const numericValue =
    typeof value === "string"
      ? Number(value)
      : typeof value === "number"
        ? value
        : null;
  if (numericValue === null || Number.isNaN(numericValue)) return null;
  return Math.round(numericValue * 100);
};

export function calculateMercadoPagoFees(payment: any, totalCents: number): {
  feeCents: number;
  netAmountCents: number;
} {
  if (!payment) {
    return { feeCents: 0, netAmountCents: totalCents };
  }

  const transactionDetails = payment.transaction_details ?? {};
  const feeDetails = [
    ...(Array.isArray(payment.fee_details) ? payment.fee_details : []),
    ...(Array.isArray(transactionDetails.fee_details) ? transactionDetails.fee_details : [])
  ];

  const transactionAmountCents =
    toCents(
      transactionDetails.total_paid_amount ??
        transactionDetails.transaction_amount ??
        payment.transaction_amount
    ) ?? totalCents;

  let feeCents = 0;
  let netAmountCents = transactionAmountCents;

  // Taxa direta exposta no payload
  const transactionFee = toCents(transactionDetails.fee);
  if (transactionFee !== null) {
    feeCents = transactionFee;
  }

  // Somar todas as fee_details retornadas pela API
  if (feeCents === 0 && feeDetails.length) {
    const totalFees = feeDetails.reduce((sum, detail) => {
      const amount = toCents(detail?.amount);
      return sum + (amount ?? 0);
    }, 0);
    if (totalFees > 0) {
      feeCents = totalFees;
    }
  }

  // Valor liquido recebido
  const netValue =
    transactionDetails.net_received_amount ??
    transactionDetails.net_amount ??
    payment.net_amount;
  const parsedNet = toCents(netValue);
  if (parsedNet !== null) {
    netAmountCents = parsedNet;
  } else if (feeCents > 0) {
    netAmountCents = transactionAmountCents - feeCents;
  }

  // Se ainda nao temos taxa mas temos bruto x liquido, usar diferenca
  if (feeCents === 0 && netAmountCents !== transactionAmountCents) {
    feeCents = Math.max(0, transactionAmountCents - netAmountCents);
  }

  // Fallback para taxa padrao
  if (feeCents === 0) {
    feeCents = Math.round(transactionAmountCents * MERCADO_PAGO_FEE_PERCENTAGE);
    netAmountCents = transactionAmountCents - feeCents;
  }

  netAmountCents = Math.min(netAmountCents, transactionAmountCents);
  feeCents = Math.max(0, feeCents);
  netAmountCents = Math.max(0, netAmountCents);

  return { feeCents, netAmountCents };
}
