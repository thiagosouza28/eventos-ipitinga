import cron from "node-cron";

import { env } from "../config/env";
import { prisma } from "../lib/prisma";
import { logger } from "../utils/logger";

export const cancelExpiredOrders = async () => {
  const now = new Date();
  const expiredOrders = await prisma.order.findMany({
    where: {
      status: "PENDING",
      OR: [
        {
          expiresAt: {
            lte: now
          }
        },
        {
          createdAt: {
            lte: new Date(now.getTime() - env.ORDER_EXPIRATION_MINUTES * 60 * 1000)
          }
        }
      ]
    },
    select: {
      id: true,
      registrations: true
    }
  });

  if (!expiredOrders.length) return;

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
};

let job: cron.ScheduledTask | null = null;

export const startOrderExpirationJob = () => {
  if (env.NODE_ENV === "test") return;
  job = cron.schedule(env.CRON_CANCEL_EXPIRED, async () => {
    try {
      await cancelExpiredOrders();
    } catch (error) {
      logger.error({ error }, "Erro ao executar job de expiração");
    }
  });
  job.start();
  logger.info({ schedule: env.CRON_CANCEL_EXPIRED }, "Job de expiração iniciado");
};

export const stopOrderExpirationJob = () => {
  if (job) {
    job.stop();
  }
};

