/**
 * Calcula as taxas do Mercado Pago baseado no objeto de pagamento
 * As taxas do Mercado Pago geralmente estão em:
 * - transaction_details.fee (taxa total)
 * - transaction_details.net_received_amount (valor líquido recebido)
 * - transaction_amount (valor bruto)
 * 
 * Taxa padrão do Mercado Pago: 0,94% para pagamentos via PIX
 */
const MERCADO_PAGO_FEE_PERCENTAGE = 0.0094; // 0,94%

export function calculateMercadoPagoFees(payment: any, totalCents: number): {
  feeCents: number;
  netAmountCents: number;
} {
  // Se não for pagamento via Mercado Pago, não há taxas
  if (!payment || !payment.transaction_details) {
    return { feeCents: 0, netAmountCents: totalCents };
  }

  const transactionDetails = payment.transaction_details;
  
  // Tentar obter a taxa do Mercado Pago
  let feeCents = 0;
  let netAmountCents = totalCents;

  // Taxa do Mercado Pago (geralmente em transaction_details.fee)
  if (transactionDetails.fee !== undefined) {
    feeCents = Math.round(transactionDetails.fee * 100);
  } else if (transactionDetails.fee_payer) {
    // Se não há taxa explícita mas há fee_payer, pode ser que a taxa seja zero ou calculada diferentemente
    feeCents = 0;
  }

  // Valor líquido recebido (transaction_details.net_received_amount)
  if (transactionDetails.net_received_amount !== undefined) {
    netAmountCents = Math.round(transactionDetails.net_received_amount * 100);
    // Se temos o valor líquido, calcular a taxa como diferença
    if (feeCents === 0 && transactionDetails.transaction_amount !== undefined) {
      const transactionAmountCents = Math.round(transactionDetails.transaction_amount * 100);
      feeCents = transactionAmountCents - netAmountCents;
    }
  } else {
    // Se não temos o valor líquido, calcular como diferença
    if (transactionDetails.transaction_amount !== undefined) {
      const transactionAmountCents = Math.round(transactionDetails.transaction_amount * 100);
      netAmountCents = transactionAmountCents - feeCents;
    }
  }

  // Se ainda não conseguimos calcular a taxa, usar a taxa padrão de 0,94%
  if (feeCents === 0 && netAmountCents === totalCents) {
    feeCents = Math.round(totalCents * MERCADO_PAGO_FEE_PERCENTAGE);
    netAmountCents = totalCents - feeCents;
  }

  // Garantir que não temos valores negativos
  feeCents = Math.max(0, feeCents);
  netAmountCents = Math.max(0, netAmountCents);

  return { feeCents, netAmountCents };
}


