import { PaymentMethod } from "@/config/payment-methods";
import { prisma } from "@/lib/prisma";
import { AppError, NotFoundError } from "@/utils/errors";
import { logger } from "@/utils/logger";
import { resolveEffectiveExpirationDate } from "@/utils/order-expiration";

import {
  getActivePixGateway,
  getActivePixProvider,
  normalizePixProvider
} from "./pix-gateway";
import type { PixChargeResponse, PixGatewayProvider } from "./gateways/BasePixGateway";

type Headers = Record<string, unknown>;
type Query = Record<string, unknown>;

const approvedStatuses = new Set([
  "paid",
  "approved",
  "authorized",
  "completed",
  "confirmed",
  "success",
  "succeeded"
]);

class PixPaymentService {
  private buildPixQrData(charge: PixChargeResponse) {
    const qrCode =
      charge.payload ??
      charge.qrCode ??
      charge.raw?.qr_code ??
      charge.raw?.qrCode ??
      charge.raw?.payload ??
      null;
    const qrCodeBase64 =
      charge.qrCodeBase64 ??
      charge.raw?.qr_code_base64 ??
      charge.raw?.qrCodeBase64 ??
      null;

    if (!qrCode && !qrCodeBase64) return null;
    return {
      qr_code: qrCode ?? "",
      qr_code_base64: qrCodeBase64 ?? ""
    };
  }

  async createCharge(orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { registrations: true, event: true }
    });
    if (!order) {
      throw new NotFoundError("Pedido nao encontrado");
    }

    const gateway = await getActivePixGateway();
    const charge = await gateway.createCharge({
      id: order.id,
      totalCents: order.totalCents,
      buyerCpf: order.buyerCpf,
      createdAt: order.createdAt,
      expiresAt: order.expiresAt,
      paymentMethod: order.paymentMethod,
      registrations: order.registrations,
      event: order.event ?? undefined
    });

    const pixQrData = this.buildPixQrData(charge);
    const expiresAt = resolveEffectiveExpirationDate(
      (order.paymentMethod as PaymentMethod) ?? PaymentMethod.PIX_MP,
      order.createdAt,
      order.expiresAt ?? undefined
    );

    await prisma.order
      .update({
        where: { id: order.id },
        data: {
          mpPaymentId: charge.chargeId ?? order.mpPaymentId ?? null,
          expiresAt
        }
      })
      .catch((error) => {
        logger.warn({ orderId, error }, "Falha ao atualizar pedido apos criar cobranca PIX");
      });

    return {
      provider: gateway.provider,
      orderId: order.id,
      chargeId: charge.chargeId,
      pixQrData,
      payload: charge.payload ?? pixQrData?.qr_code ?? null,
      expiresAt: charge.expiresAt ?? expiresAt ?? null
    };
  }

  detectProvider(payload: any, headers: Headers = {}, query: Query = {}): PixGatewayProvider | null {
    const topic = (query?.topic ?? payload?.topic ?? "").toString().toLowerCase();
    const type = (payload?.type ?? payload?.event ?? payload?.action ?? "").toString().toLowerCase();

    if (topic.includes("mercadopago") || payload?.user_id || payload?.api_version) return "mercadopago";

    const headerProvider =
      typeof headers["x-pix-provider"] === "string" ? (headers["x-pix-provider"] as string) : null;
    if (headerProvider) {
      return normalizePixProvider(headerProvider);
    }

    if (type.includes("openpix") || payload?.charge || payload?.data?.charge) {
      return "openpix";
    }
    if (payload?.pix) return "gerencianet";

    return null;
  }

  private normalizeWebhookPayload(payload: any, provider: PixGatewayProvider) {
    const charge = payload?.charge ?? payload?.data?.charge ?? payload?.data ?? payload ?? {};
    const status =
      (charge?.status ??
        payload?.status ??
        payload?.event ??
        payload?.type ??
        payload?.action ??
        payload?.topic ??
        "").toString() || undefined;

    const orderId =
      charge?.correlationID ??
      charge?.correlationId ??
      charge?.customId ??
      charge?.txid ??
      charge?.transactionId ??
      payload?.orderId ??
      payload?.txid ??
      null;

    const paymentId =
      charge?.id ??
      charge?.paymentId ??
      charge?.txid ??
      payload?.id ??
      payload?.paymentId ??
      orderId ??
      null;

    const idempotencyKey =
      payload?.idempotencyKey ??
      payload?.idempotency_key ??
      payload?.id ??
      `${provider}:${paymentId ?? orderId ?? Date.now()}`;

    return {
      orderId: orderId ? String(orderId) : null,
      paymentId: paymentId ? String(paymentId) : null,
      status,
      idempotencyKey: String(idempotencyKey)
    };
  }

  private isApproved(status?: string | null) {
    if (!status) return false;
    return approvedStatuses.has(status.toString().toLowerCase());
  }

  async handleWebhook(
    payload: any,
    provider?: PixGatewayProvider | null,
    headers: Headers = {},
    query: Query = {}
  ) {
    const resolvedProvider =
      provider ??
      this.detectProvider(payload, headers, query) ??
      (await getActivePixProvider()) ??
      "unknown";

    const normalized = this.normalizeWebhookPayload(payload, resolvedProvider);
    if (!normalized.orderId) {
      throw new AppError("Webhook PIX sem referencia de pedido.", 400);
    }

    const idempotencyKey = normalized.idempotencyKey;
    const exists = await prisma.webhookEvent.findUnique({ where: { idempotencyKey } });
    if (exists) {
      logger.info({ idempotencyKey }, "Webhook PIX ignorado por idempotencia");
      return { status: "ignored" };
    }

    await prisma.webhookEvent.create({
      data: {
        provider: resolvedProvider,
        eventType: normalized.status ?? "unknown",
        payloadJson: JSON.stringify(payload),
        idempotencyKey,
        order: {
          connect: { id: normalized.orderId }
        },
        processedAt: this.isApproved(normalized.status) ? new Date() : null
      }
    });

    if (this.isApproved(normalized.status)) {
      const { orderService } = await import("../orders/order.service");
      await orderService.markPaid(normalized.orderId, normalized.paymentId ?? normalized.orderId, {
        paymentMethod: PaymentMethod.PIX_MP
      });
    }

    return {
      status: this.isApproved(normalized.status) ? "processed" : "recorded",
      provider: resolvedProvider
    };
  }
}

export const pixPaymentService = new PixPaymentService();
