import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/errors";
import { logger } from "../../utils/logger";
import { paymentService, extractPreferenceVersion } from "../../services/payment.service";
import { orderService } from "../orders/order.service";

export class WebhookService {
  async handleMercadoPago(payload: any, signature?: string, topic?: string) {
    const paymentId = payload?.data?.id ?? payload?.id;
    if (!paymentId) {
      throw new AppError("Payload invalido", 400);
    }

    const idempotencyKey = `${paymentId}:${payload?.type ?? payload?.action ?? topic}`;
    const alreadyProcessed = await prisma.webhookEvent.findUnique({
      where: { idempotencyKey }
    });
    if (alreadyProcessed) {
      logger.info({ idempotencyKey }, "Webhook Mercado Pago ignorado (idempotente)");
      return { status: "ignored" };
    }

    const payment = await paymentService.fetchPayment(String(paymentId));
    const rawOrderId = payment?.external_reference ?? payment?.order?.id;
    if (!rawOrderId) {
      throw new AppError("Webhook sem referencia de pedido", 400);
    }
    const orderId = String(rawOrderId);

    await prisma.webhookEvent.create({
      data: {
        provider: "mercadopago",
        eventType: payload.type ?? payload.action ?? "unknown",
        payloadJson: JSON.stringify(payload),
        idempotencyKey,
        order: {
          connect: { id: orderId }
        }
      }
    });

    const status = payment.status as string | undefined;
    logger.info({ orderId, status }, "Webhook Mercado Pago recebido");

    if (status === "approved" || status === "authorized") {
      const metadataVersion = extractPreferenceVersion((payment as any)?.metadata);
      await orderService.markPaid(orderId, String(payment.id), metadataVersion ?? undefined);
    }

    if (status === "refunded" || status === "charged_back") {
      for (const item of payment.additional_info?.items ?? []) {
        if (item?.id) {
          await orderService.markRefunded({
            orderId,
            registrationId: String(item.id),
            amountCents: Math.round(item.unit_price * 100),
            mpRefundId: `${payment.id}-${item.id}`,
            reason: "Webhook Mercado Pago"
          });
        }
      }
    }

    return { status: "processed" };
  }
}

export const webhookService = new WebhookService();
