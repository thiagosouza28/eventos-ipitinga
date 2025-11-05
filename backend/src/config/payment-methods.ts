export const PaymentMethod = {
  PIX_MP: "PIX_MP",
  CASH: "CASH",
  CARD_FULL: "CARD_FULL",
  CARD_INSTALLMENTS: "CARD_INSTALLMENTS",
  FREE_PREVIOUS_YEAR: "FREE_PREVIOUS_YEAR"
} as const;

export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export const ManualPaymentMethods: PaymentMethod[] = [
  PaymentMethod.CASH,
  PaymentMethod.CARD_FULL,
  PaymentMethod.CARD_INSTALLMENTS
];

export const AdminOnlyPaymentMethods: PaymentMethod[] = [
  PaymentMethod.FREE_PREVIOUS_YEAR
];

export const FreePaymentMethods: PaymentMethod[] = [
  PaymentMethod.FREE_PREVIOUS_YEAR
];

export const DEFAULT_PAYMENT_METHODS: PaymentMethod[] = [PaymentMethod.PIX_MP];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  [PaymentMethod.PIX_MP]: "PIX - Mercado Pago",
  [PaymentMethod.CASH]: "Dinheiro",
  [PaymentMethod.CARD_FULL]: "Cartão à vista",
  [PaymentMethod.CARD_INSTALLMENTS]: "Cartão parcelado",
  [PaymentMethod.FREE_PREVIOUS_YEAR]: "Gratuito / Ganhou Inscrição no Ano Anterior"
};

const allowedMethods = new Set<PaymentMethod>(Object.values(PaymentMethod));

const sanitize = (input: string | null | undefined) =>
  (input ?? "")
    .split(",")
    .map((value) => value.trim().toUpperCase())
    .filter(Boolean) as PaymentMethod[];

export const parsePaymentMethods = (raw: string | null | undefined): PaymentMethod[] => {
  const methods = sanitize(raw);
  if (!methods.length) {
    return [...DEFAULT_PAYMENT_METHODS];
  }
  const unique = Array.from(new Set(methods));
  return unique.filter((method): method is PaymentMethod =>
    allowedMethods.has(method as PaymentMethod)
  );
};

export const serializePaymentMethods = (methods: PaymentMethod[]): string => {
  const unique = Array.from(new Set(methods));
  return unique.length ? unique.join(",") : DEFAULT_PAYMENT_METHODS.join(",");
};
