import { prisma } from "../lib/prisma";
import { logger } from "../utils/logger";

class AuditService {
  async log({
    actorUserId,
    action,
    entity,
    entityId,
    metadata
  }: {
    actorUserId?: string;
    action: string;
    entity: string;
    entityId: string;
    metadata?: Record<string, unknown>;
  }) {
    await prisma.auditLog.create({
      data: {
        actorUserId: actorUserId ?? null,
        action,
        entity,
        entityId,
        metadataJson: metadata ? JSON.stringify(metadata) : null
      }
    });
    logger.info({ action, entity, entityId }, "Audit log registrado");
  }
}

export const auditService = new AuditService();
