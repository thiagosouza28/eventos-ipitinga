export const PendingPaymentValueRuleValues = ["KEEP_ORIGINAL", "UPDATE_TO_ACTIVE_LOT"] as const;

export type PendingPaymentValueRule = (typeof PendingPaymentValueRuleValues)[number];

export const DEFAULT_PENDING_PAYMENT_VALUE_RULE: PendingPaymentValueRule = "KEEP_ORIGINAL";

export const isPendingPaymentValueRule = (value: unknown): value is PendingPaymentValueRule =>
  typeof value === "string" && PendingPaymentValueRuleValues.includes(value as PendingPaymentValueRule);
