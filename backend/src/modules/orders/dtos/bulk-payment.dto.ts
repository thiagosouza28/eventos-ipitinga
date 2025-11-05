import { z } from "zod";

export const BulkPaymentDto = z.object({
  orderIds: z.string().array(),
  paymentMethod: z.string()
});

export type BulkPaymentDto = z.infer<typeof BulkPaymentDto>;