import cron from "node-cron";

import { env } from "../config/env";
import { logger } from "../utils/logger";
import { cancelExpiredOrders } from "./cancel-expired-orders";

let job: cron.ScheduledTask | null = null;

export const startOrderExpirationJob = () => {
  if (env.NODE_ENV === "test") return;
  job = cron.schedule(env.CRON_CANCEL_EXPIRED, async () => {
    try {
      await cancelExpiredOrders();
    } catch (error) {
      logger.error({ error }, "Erro ao executar job de expiracao");
    }
  });
  job.start();
  logger.info({ schedule: env.CRON_CANCEL_EXPIRED }, "Job de expiracao iniciado");
};

export const stopOrderExpirationJob = () => {
  if (job) {
    job.stop();
  }
};

