import { prisma } from "../../lib/prisma";
import { AppError, ConflictError, NotFoundError } from "../../utils/errors";
import { auditService } from "../../services/audit.service";
import { env } from "../../config/env";
import { cacheDelete, cacheGetOrSet } from "../../utils/cache";

type MinistryPayload = {
  name: string;
  description?: string | null;
  isActive?: boolean;
};

const ministriesCacheKey = (includeInactive: boolean) =>
  `catalog:ministries:${includeInactive ? "all" : "active"}`;

export class MinistryService {
  list(includeInactive = true) {
    return cacheGetOrSet(
      ministriesCacheKey(includeInactive),
      env.CACHE_TTL_MS,
      () =>
        prisma.ministry.findMany({
          where: includeInactive ? {} : { isActive: true },
          orderBy: { name: "asc" }
        }),
      { maxEntries: env.CACHE_MAX_ENTRIES }
    );
  }

  async create(data: MinistryPayload, actorUserId?: string) {
    const existing = await prisma.ministry.findUnique({ where: { name: data.name.trim() } });
    if (existing) {
      throw new ConflictError("Já existe um ministério com este nome");
    }

    const ministry = await prisma.ministry.create({
      data: {
        name: data.name.trim(),
        description: data.description?.trim() || null,
        isActive: data.isActive ?? true
      }
    });

    await auditService.log({
      actorUserId,
      action: "MINISTRY_CREATED",
      entity: "ministry",
      entityId: ministry.id,
      metadata: { name: ministry.name }
    });
    cacheDelete(ministriesCacheKey(true));
    cacheDelete(ministriesCacheKey(false));

    return ministry;
  }

  async update(id: string, data: Partial<MinistryPayload>, actorUserId?: string) {
    const ministry = await prisma.ministry.findUnique({ where: { id } });
    if (!ministry) {
      throw new NotFoundError("Ministério não encontrado");
    }

    if (data.name && data.name.trim() !== ministry.name) {
      const existing = await prisma.ministry.findUnique({ where: { name: data.name.trim() } });
      if (existing && existing.id !== id) {
        throw new ConflictError("Já existe um ministério com este nome");
      }
    }

    const updated = await prisma.ministry.update({
      where: { id },
      data: {
        name: data.name ? data.name.trim() : undefined,
        description: data.description !== undefined ? data.description?.trim() || null : undefined,
        isActive: data.isActive ?? undefined
      }
    });

    await auditService.log({
      actorUserId,
      action: "MINISTRY_UPDATED",
      entity: "ministry",
      entityId: id,
      metadata: data
    });
    cacheDelete(ministriesCacheKey(true));
    cacheDelete(ministriesCacheKey(false));

    return updated;
  }

  async delete(id: string, actorUserId?: string) {
    const ministry = await prisma.ministry.findUnique({ where: { id } });
    if (!ministry) {
      throw new NotFoundError("Ministério não encontrado");
    }

    const [events, users] = await Promise.all([
      prisma.event.count({ where: { ministryId: id } }),
      prisma.ministryUser.count({ where: { ministryId: id } })
    ]);

    if (events > 0 || users > 0) {
      throw new AppError("Não é possível excluir ministério com eventos ou usuários vinculados", 400);
    }

    await prisma.ministry.delete({ where: { id } });
    await auditService.log({
      actorUserId,
      action: "MINISTRY_DELETED",
      entity: "ministry",
      entityId: id
    });
    cacheDelete(ministriesCacheKey(true));
    cacheDelete(ministriesCacheKey(false));
  }
}

export const ministryService = new MinistryService();
