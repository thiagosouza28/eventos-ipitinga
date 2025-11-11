export const PENDING_PAYMENT_VALUE_RULES = [
  {
    value: "KEEP_ORIGINAL",
    label: "Manter valor original da inscrição",
    description:
      "O valor fica preso ao lote escolhido no momento da inscrição e não muda, mesmo que o lote seja renovado depois."
  },
  {
    value: "UPDATE_TO_ACTIVE_LOT",
    label: "Atualizar valor para o lote vigente no momento do pagamento",
    description:
      "Quando o participante for pagar, o sistema recalcula o valor pendente pelo lote ativo naquele instante antes de gerar a cobrança."
  }
] as const;

export type PendingPaymentValueRule = (typeof PENDING_PAYMENT_VALUE_RULES)[number]["value"];

export const DEFAULT_PENDING_PAYMENT_VALUE_RULE = PENDING_PAYMENT_VALUE_RULES[0].value;

const LABEL_MAP = PENDING_PAYMENT_VALUE_RULES.reduce<
  Record<PendingPaymentValueRule, string>
>((acc, option) => {
  acc[option.value] = option.label;
  return acc;
}, {} as Record<PendingPaymentValueRule, string>);

const DESCRIPTION_MAP = PENDING_PAYMENT_VALUE_RULES.reduce<
  Record<PendingPaymentValueRule, string>
>((acc, option) => {
  acc[option.value] = option.description;
  return acc;
}, {} as Record<PendingPaymentValueRule, string>);

export const getPendingPaymentValueRuleLabel = (value?: PendingPaymentValueRule | string) =>
  LABEL_MAP[(value ?? DEFAULT_PENDING_PAYMENT_VALUE_RULE) as PendingPaymentValueRule] ?? String(value ?? "");

export const getPendingPaymentValueRuleDescription = (value?: PendingPaymentValueRule | string) =>
  DESCRIPTION_MAP[(value ?? DEFAULT_PENDING_PAYMENT_VALUE_RULE) as PendingPaymentValueRule] ?? "";
