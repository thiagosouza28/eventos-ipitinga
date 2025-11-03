export const PAYMENT_METHODS = [
  { value: "PIX_MP", label: "PIX (Mercado Pago)", description: "Pagamento automático via Pix" },
  { value: "CASH", label: "Dinheiro", description: "Pagamento manual em dinheiro" },
  { value: "CARD_FULL", label: "Cartão à vista", description: "Pagamento manual via cartão à vista" },
  { value: "CARD_INSTALLMENTS", label: "Cartão parcelado", description: "Pagamento manual com parcelas" }
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number]["value"];

export const MANUAL_PAYMENT_METHODS: PaymentMethod[] = ["CASH", "CARD_FULL", "CARD_INSTALLMENTS"];

export const paymentMethodLabel = (method: string | null | undefined) => {
  const found = PAYMENT_METHODS.find((item) => item.value === method);
  return found?.label ?? method ?? "Desconhecido";
};
