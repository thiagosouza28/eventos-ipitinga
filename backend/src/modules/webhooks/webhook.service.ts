import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/errors";
import { logger } from "../../utils/logger";
import { paymentService, extractPreferenceVersion } from "../../services/payment.service";
import { orderService } from "../orders/order.service";

export class WebhookService {
  async handleMercadoPago(payload: any, signature?: string, topic?: string) {
    const paymentId = payload?.data?.id ?? payload?.id;
    if (!paymentId) {
      throw new AppError("Payload inválido", 400);
    }

    const payment = await paymentService.fetchPayment(String(paymentId));
    const rawOrderId = payment?.external_reference ?? payment?.order?.id;
    if (!rawOrderId) {
      throw new AppError("Webhook sem referência de pedido", 400);
    }
    
    const externalRef = String(rawOrderId);
    const isBulk = externalRef.startsWith("BULK:");
    const orderIds = isBulk 
      ? externalRef.replace("BULK:", "").split(",")
      : [externalRef];

    // Verificar idempotência para cada pedido individualmente
    const baseIdempotencyKey = `${paymentId}:${payload?.type ?? payload?.action ?? topic}`;
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

      // Criar webhook event para este pedido
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

    // Se todos os pedidos já foram processados, retornar
    if (processedOrders.length === orderIds.length) {
      return { status: "ignored" };
    }

    const status = payment.status as string | undefined;
    logger.info({ orderIds, status, isBulk }, "Webhook Mercado Pago recebido");

    if (status === "approved" || status === "authorized") {
      const metadataVersion = extractPreferenceVersion((payment as any)?.metadata);
      // Marcar todos os pedidos como pagos
      for (const orderId of orderIds) {
        await orderService.markPaid(orderId, String(payment.id), {
          preferenceVersion: metadataVersion ?? undefined
        });
      }
    }

    if (status === "refunded" || status === "charged_back") {
      // Para pagamentos em lote, processar refund para cada pedido
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
