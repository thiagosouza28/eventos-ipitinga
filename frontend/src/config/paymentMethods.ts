export const PAYMENT_METHODS = [
  { value: "PIX_MP", label: "PIX (Mercado Pago)", description: "Pagamento automático via Pix" },
  { value: "CASH", label: "Dinheiro", description: "Pagamento manual em dinheiro" },
  { value: "CARD_FULL", label: "Cartão à vista", description: "Pagamento manual via cartão à vista" },
  { value: "CARD_INSTALLMENTS", label: "Cartão parcelado", description: "Pagamento manual com parcelas" },
  { value: "FREE_PREVIOUS_YEAR", label: "Gratuito / Ganhou Inscrição no Ano Anterior", description: "Marcar como pago automaticamente (apenas administrador)" }
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number]["value"];

export const MANUAL_PAYMENT_METHODS: PaymentMethod[] = ["CASH", "CARD_FULL", "CARD_INSTALLMENTS"];

export const ADMIN_ONLY_PAYMENT_METHODS: PaymentMethod[] = ["FREE_PREVIOUS_YEAR"];

export const FREE_PAYMENT_METHODS: PaymentMethod[] = ["FREE_PREVIOUS_YEAR"];

export const paymentMethodLabel = (method: string | null | undefined) => {
  const found = PAYMENT_METHODS.find((item) => item.value === method);
  return found?.label ?? method ?? "Desconhecido";
};
