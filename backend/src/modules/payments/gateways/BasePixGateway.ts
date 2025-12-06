import type { PixGatewayConfig } from "@/prisma/generated/client";

export type PixGatewayProvider =
  | "mercadopago"
  | "openpix"
  | "sicoob"
  | "gerencianet"
  | "itau"
  | "santander"
  | "bradesco"
  | "sicredi"
  | "inter"
  | "nubank"
  | "unknown";

export type PixOrderContext = {
  id: string;
  totalCents: number;
  buyerCpf: string;
  createdAt: Date;
  expiresAt: Date | null;
  paymentMethod?: string | null;
  registrations?: Array<{ id: string; fullName: string; priceCents?: number | null }>;
  event?: {
    id: string;
    title?: string | null;
    pendingPaymentValueRule?: string | null;
    priceCents?: number | null;
  };
};

export type PixChargeResponse = {
  chargeId: string;
  payload?: string | null;
  qrCode?: string | null;
  qrCodeBase64?: string | null;
  deeplinkUrl?: string | null;
  expiresAt?: Date | string | null;
  raw?: any;
};

export type PixChargeStatus = {
  chargeId: string;
  status: "PENDING" | "PAID" | "EXPIRED" | "CANCELED" | "UNKNOWN";
  paidAt?: Date | string | null;
  raw?: any;
};

export type PixWebhookNormalized = {
  provider: PixGatewayProvider;
  orderId?: string;
  paymentId?: string;
  status?: string;
  idempotencyKey?: string;
  raw?: any;
};

export abstract class BasePixGateway {
  abstract readonly provider: PixGatewayProvider;

  constructor(protected readonly config: PixGatewayConfig) {}

  abstract createCharge(order: PixOrderContext): Promise<PixChargeResponse>;

  abstract getChargeStatus(chargeId: string): Promise<PixChargeStatus>;

  normalizeWebhook?(payload: any, headers?: Record<string, unknown>): PixWebhookNormalized | null;
}
