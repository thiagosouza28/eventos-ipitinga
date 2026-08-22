import { PaymentMethod } from "../config/payment-methods";
import { prisma } from "../lib/prisma";
import { resolveEffectiveExpirationDate } from "../utils/order-expiration";
import { logger } from "../utils/logger";

export const cancelExpiredOrders = async () => {
  const now = new Date();
  const pendingOrders = await prisma.order.findMany({
    where: { status: "PENDING" },
    select: {
      id: true,
      createdAt: true,
      expiresAt: true,
      paymentMethod: true,
      registrations: true
    }
  });

  const expiredOrders = pendingOrders.filter(
    (order) =>
      resolveEffectiveExpirationDate(
        order.paymentMethod as PaymentMethod,
        order.createdAt,
        order.expiresAt
      ) <= now
  );

  if (!expiredOrders.length) return 0;

  logger.info({ count: expiredOrders.length }, "Cancelando pedidos expirados");

  const orderIds = expiredOrders.map((order) => order.id);
  const registrationIds = expiredOrders.flatMap((order) => order.registrations.map((r) => r.id));

  await prisma.$transaction([
    prisma.registration.updateMany({
      where: { id: { in: registrationIds }, status: { in: ["PENDING_PAYMENT", "DRAFT"] } },
      data: { status: "CANCELED" }
    }),
    prisma.order.updateMany({
      where: { id: { in: orderIds } },
      data: { status: "EXPIRED" }
    }),
    prisma.auditLog.createMany({
      data: expiredOrders.map((order) => ({
        action: "ORDER_EXPIRED",
        entity: "order",
        entityId: order.id,
        metadataJson: JSON.stringify({ reason: "expired" })
      }))
    })
  ]);

  return expiredOrders.length;
};
