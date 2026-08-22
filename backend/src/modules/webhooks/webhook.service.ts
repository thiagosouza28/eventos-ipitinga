import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/errors";
import { logger } from "../../utils/logger";
import { paymentService, extractPreferenceVersion } from "../../services/payment.service";
import { orderService } from "../orders/order.service";

type WebhookDependencies = {
  prisma: typeof prisma;
  paymentService: typeof paymentService;
  orderService: typeof orderService;
};

const isUniqueConstraintError = (error: unknown) =>
  Boolean(error && typeof error === "object" && "code" in error && error.code === "P2002");

export class WebhookService {
  constructor(
    private readonly dependencies: WebhookDependencies = {
      prisma,
      paymentService,
      orderService
    }
  ) {}

  async handleMercadoPago(payload: any, signature?: string, topic?: string) {
    const { prisma, paymentService, orderService } = this.dependencies;
    const resourceId = payload?.data?.id ?? payload?.id;
    if (!resourceId) {
      throw new AppError("Payload inválido", 400);
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
          merchantOrder?.payments?.find((p: any) => p?.status === "approved") ??
          merchantOrder?.payments?.[0];
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
    const orderIds = (isBulk
      ? externalRef.replace("BULK:", "").split(",")
      : [externalRef]
    ).map((orderId) => orderId.trim()).filter(Boolean);

    if (!orderIds.length) {
      throw new AppError("Webhook sem pedidos associados", 400);
    }

    const status =
      (payment?.status as string | undefined) ??
      (merchantApprovedPayment?.status as string | undefined) ??
      (merchantOrder?.order_status as string | undefined);

    const eventName = payload?.action ?? payload?.type ?? topic ?? "unknown";
    // `payment.updated` pode chegar primeiro como pending e depois como approved.
    // O status precisa fazer parte da chave para a aprovação não ser descartada.
    const baseIdempotencyKey = `${paymentIdForReference ?? resourceId}:${eventName}:${status ?? "unknown"}`;
    const pendingEvents: Array<{ orderId: string; idempotencyKey: string }> = [];

    for (const orderId of orderIds) {
      const idempotencyKey = `${baseIdempotencyKey}:${orderId}`;
      const alreadyProcessed = await prisma.webhookEvent.findUnique({
        where: { idempotencyKey }
      });

      if (alreadyProcessed?.processedAt) {
        logger.info({ idempotencyKey, orderId }, "Webhook Mercado Pago ignorado (idempotente)");
        continue;
      }

      if (!alreadyProcessed) {
        try {
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
        } catch (error) {
          if (!isUniqueConstraintError(error)) throw error;
          const concurrentEvent = await prisma.webhookEvent.findUnique({
            where: { idempotencyKey }
          });
          if (concurrentEvent?.processedAt) continue;
          if (!concurrentEvent) throw error;
        }
      }

      pendingEvents.push({ orderId, idempotencyKey });
    }

    if (!pendingEvents.length) {
      return { status: "ignored" };
    }

    const pendingOrderIds = pendingEvents.map(({ orderId }) => orderId);
    const orders = await prisma.order.findMany({
      where: { id: { in: pendingOrderIds } },
      select: { id: true, totalCents: true }
    });
    if (orders.length !== pendingOrderIds.length) {
      throw new AppError("Webhook referencia pedido inexistente", 404);
    }

    const transactionAmount = Number(payment?.transaction_amount);
    if (Number.isFinite(transactionAmount)) {
      const paidAmountCents = Math.round(transactionAmount * 100);
      const expectedAmountCents = orders.reduce((total, order) => total + order.totalCents, 0);
      if (paidAmountCents !== expectedAmountCents) {
        logger.error(
          { pendingOrderIds, paidAmountCents, expectedAmountCents, paymentIdForReference },
          "Pagamento Mercado Pago com valor divergente"
        );
        throw new AppError("Valor do pagamento diverge do valor do pedido", 409);
      }
    }

    if (payment?.currency_id && payment.currency_id !== "BRL") {
      throw new AppError("Moeda do pagamento Mercado Pago inválida", 409);
    }

    const markEventsProcessed = async () => {
      await prisma.webhookEvent.updateMany({
        where: {
          idempotencyKey: { in: pendingEvents.map(({ idempotencyKey }) => idempotencyKey) }
        },
        data: { processedAt: new Date() }
      });
    };

    logger.info({ orderIds: pendingOrderIds, status, isBulk, topic: topicValue }, "Webhook Mercado Pago recebido");

    const isApprovedStatus =
      payment?.status === "approved" ||
      (!payment && merchantApprovedPayment?.status === "approved") ||
      (!payment && merchantOrder?.order_status === "paid");

    if (isApprovedStatus) {
      const metadataVersion = extractPreferenceVersion((payment as any)?.metadata);
      if (!paymentIdForReference) {
        throw new AppError("Pagamento aprovado sem identificador", 502);
      }

      const approvedAtRaw = payment?.date_approved;
      const approvedAt = approvedAtRaw ? new Date(approvedAtRaw) : undefined;
      const paidAt = approvedAt && !Number.isNaN(approvedAt.getTime()) ? approvedAt : undefined;
      for (const orderId of pendingOrderIds) {
        await orderService.markPaid(orderId, paymentIdForReference, {
          preferenceVersion: metadataVersion ?? undefined,
          paidAt
        });
      }
    }

    if ((status === "refunded" || status === "charged_back") && payment) {
      for (const orderId of pendingOrderIds) {
        const order = await prisma.order.findUnique({
          where: { id: orderId },
          include: { registrations: true }
        });

        if (order) {
          for (const registration of order.registrations) {
            await orderService.markRefunded({
              orderId,
              registrationId: registration.id,
              amountCents: registration.priceCents,
              mpRefundId: `${payment.id}-${registration.id}`,
              reason: "Webhook Mercado Pago"
            });
          }
        }
      }
    }

    await markEventsProcessed();
    return { status: "processed" };
  }
}

export const webhookService = new WebhookService();
