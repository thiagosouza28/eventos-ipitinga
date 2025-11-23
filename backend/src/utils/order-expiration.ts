import { env } from "../config/env";
import { PaymentMethod } from "../config/payment-methods";

export const PIX_EXPIRATION_MINUTES = 72 * 60;

export const resolveOrderExpirationMinutes = (paymentMethod?: PaymentMethod | null) => {
  if (paymentMethod === PaymentMethod.PIX_MP) {
    return PIX_EXPIRATION_MINUTES;
  }
  return env.ORDER_EXPIRATION_MINUTES;
};

export const resolveOrderExpirationDate = (
  paymentMethod?: PaymentMethod | null,
  from: Date = new Date()
) => new Date(from.getTime() + resolveOrderExpirationMinutes(paymentMethod) * 60 * 1000);

export const resolvePixExpirationDate = (from: Date = new Date()) =>
  new Date(from.getTime() + PIX_EXPIRATION_MINUTES * 60 * 1000);

export const resolveEffectiveExpirationDate = (
  paymentMethod: PaymentMethod | null | undefined,
  createdAt: Date,
  storedExpiresAt?: Date | null
) => {
  const ruleExpiration = resolveOrderExpirationDate(paymentMethod, createdAt);
  if (storedExpiresAt && storedExpiresAt > ruleExpiration) {
    return storedExpiresAt;
  }
  return ruleExpiration;
};
