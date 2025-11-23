import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/errors";
import { logger } from "../../utils/logger";
import { paymentService, extractPreferenceVersion } from "../../services/payment.service";
import { orderService } from "../orders/order.service";

export class WebhookService {
  async handleMercadoPago(payload: any, signature?: string, topic?: string) {
    const resourceId = payload?.data?.id ?? payload?.id;
    if (!resourceId) {
      throw new AppError("Payload invalido", 400);
    }

    const topicValue = String(topic ?? payload?.type ?? payload?.action ?? "");
    let payment: any | null = null;
    let merchantOrder: any | null = null;
    let merchantApprovedPayment: any | null = null;

    try {
      payment = await paymentService.fetchPayment(String(resourceId));
    } catch (error) {
      logger.warn({ resourceId, topic: topicValue, error }, "Falha ao buscar pagamento direto no webhook");
    }

    if (!payment) {
      try {
        merchantOrder = await paymentService.fetchMerchantOrder(String(resourceId));
        merchantApprovedPayment =
          merchantOrder?.payments?.find(
            (p: any) => p?.status === "approved" || p?.status === "authorized"
          ) ?? merchantOrder?.payments?.[0];
      } catch (merchantError) {
        logger.warn({ resourceId, topic: topicValue, error: merchantError }, "Falha ao buscar merchant order no webhook");
      }

      if (merchantApprovedPayment?.id) {
        try {
          payment = await paymentService.fetchPayment(String(merchantApprovedPayment.id));
        } catch (error) {
          logger.warn(
            { paymentId: merchantApprovedPayment.id, topic: topicValue, error },
            "Falha ao recuperar pagamento a partir da merchant order"
          );
        }
      }
    }

    if (!payment && !merchantOrder) {
      throw new AppError("Webhook sem pagamento ou pedido associado", 400);
    }

    const rawOrderId =
      payment?.external_reference ??
      payment?.order?.id ??
      merchantOrder?.external_reference;
    if (!rawOrderId) {
      throw new AppError("Webhook sem referencia de pedido", 400);
    }

    const paymentIdForReference =
      (payment?.id && String(payment.id)) ??
      (merchantApprovedPayment?.id && String(merchantApprovedPayment.id)) ??
      null;

    const externalRef = String(rawOrderId);
    const isBulk = externalRef.startsWith("BULK:");
    const orderIds = isBulk
      ? externalRef.replace("BULK:", "").split(",")
      : [externalRef];

    const baseIdempotencyKey = `${paymentIdForReference ?? resourceId}:${
      payload?.type ?? payload?.action ?? topic ?? "unknown"
    }`;
    const processedOrders: string[] = [];

    for (const orderId of orderIds) {
      const idempotencyKey = `${baseIdempotencyKey}:${orderId}`;
      const alreadyProcessed = await prisma.webhookEvent.findUnique({
        where: { idempotencyKey }
      });

      if (alreadyProcessed) {
        logger.info({ idempotencyKey, orderId }, "Webhook Mercado Pago ignorado (idempotente)");
        processedOrders.push(orderId);
        continue;
      }

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
    }

    if (processedOrders.length === orderIds.length) {
      return { status: "ignored" };
    }

    const status =
      (payment?.status as string | undefined) ??
      (merchantApprovedPayment?.status as string | undefined) ??
      (merchantOrder?.order_status as string | undefined);
    logger.info({ orderIds, status, isBulk, topic: topicValue }, "Webhook Mercado Pago recebido");

    const isApprovedStatus =
      status === "approved" || status === "authorized" || status === "paid";

    if (isApprovedStatus) {
      const metadataVersion = extractPreferenceVersion((payment as any)?.metadata);
      if (!paymentIdForReference) {
        logger.warn({ orderIds, status }, "Pagamento aprovado recebido sem ID resolvido");
      } else {
        for (const orderId of orderIds) {
          await orderService.markPaid(orderId, paymentIdForReference, {
            preferenceVersion: metadataVersion ?? undefined
          });
        }
      }
    }

    if ((status === "refunded" || status === "charged_back") && payment) {
      for (const orderId of orderIds) {
        const order = await prisma.order.findUnique({
          where: { id: orderId },
          include: { registrations: true }
        });

        if (order) {
          for (const registration of order.registrations) {
            const item = payment.additional_info?.items?.find((i: any) => i.id === registration.id);
            if (item) {
              await orderService.markRefunded({
                orderId,
                registrationId: registration.id,
                amountCents: Math.round(item.unit_price * 100),
                mpRefundId: `${payment.id}-${registration.id}`,
                reason: "Webhook Mercado Pago"
              });
            }
          }
        }
      }
    }

    return { status: "processed" };
  }
}

export const webhookService = new WebhookService();
