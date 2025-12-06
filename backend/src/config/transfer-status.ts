export const OrderTransferStatus = {
  PENDING: "PENDING",
  TRANSFERRED: "TRANSFERRED",
  FAILED: "FAILED"
} as const;

export type OrderTransferStatus = (typeof OrderTransferStatus)[keyof typeof OrderTransferStatus];

export const TransferStatus = {
  PENDING: "PENDING",
  SUCCESS: "SUCCESS",
  FAILED: "FAILED"
} as const;

export type TransferStatus = (typeof TransferStatus)[keyof typeof TransferStatus];
