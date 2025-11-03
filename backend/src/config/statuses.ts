export const OrderStatus = {
  PENDING: "PENDING",
  PAID: "PAID",
  PARTIALLY_REFUNDED: "PARTIALLY_REFUNDED",
  CANCELED: "CANCELED",
  EXPIRED: "EXPIRED"
} as const;

export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const RegistrationStatus = {
  DRAFT: "DRAFT",
  PENDING_PAYMENT: "PENDING_PAYMENT",
  PAID: "PAID",
  CANCELED: "CANCELED",
  REFUNDED: "REFUNDED",
  CHECKED_IN: "CHECKED_IN"
} as const;

export type RegistrationStatus = (typeof RegistrationStatus)[keyof typeof RegistrationStatus];

export const OrderStatusValues = Object.values(OrderStatus);
export const RegistrationStatusValues = Object.values(RegistrationStatus);
