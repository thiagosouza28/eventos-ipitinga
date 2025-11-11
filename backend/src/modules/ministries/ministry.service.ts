import { prisma } from "../../lib/prisma";
import { AppError, ConflictError, NotFoundError } from "../../utils/errors";
import { auditService } from "../../services/audit.service";

type MinistryPayload = {
  name: string;
  description?: string | null;
  isActive?: boolean;
};

export class MinistryService {
  list(includeInactive = true) {
    return prisma.ministry.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { name: "asc" }
    });
  }

  async create(data: MinistryPayload, actorUserId?: string) {
    const existing = await prisma.ministry.findUnique({ where: { name: data.name.trim() } });
    if (existing) {
      throw new ConflictError("Ja existe um ministerio com este nome");
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

    return ministry;
  }

  async update(id: string, data: Partial<MinistryPayload>, actorUserId?: string) {
    const ministry = await prisma.ministry.findUnique({ where: { id } });
    if (!ministry) {
      throw new NotFoundError("Ministerio nao encontrado");
    }

    if (data.name && data.name.trim() !== ministry.name) {
      const existing = await prisma.ministry.findUnique({ where: { name: data.name.trim() } });
      if (existing && existing.id !== id) {
        throw new ConflictError("Ja existe um ministerio com este nome");
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

    return updated;
  }

  async delete(id: string, actorUserId?: string) {
    const ministry = await prisma.ministry.findUnique({ where: { id } });
    if (!ministry) {
      throw new NotFoundError("Ministerio nao encontrado");
    }

    const [events, users] = await Promise.all([
      prisma.event.count({ where: { ministryId: id } }),
      prisma.ministryUser.count({ where: { ministryId: id } })
    ]);

    if (events > 0 || users > 0) {
      throw new AppError("Nao e possivel excluir ministerio com eventos ou usuarios vinculados", 400);
    }

    await prisma.ministry.delete({ where: { id } });
    await auditService.log({
      actorUserId,
      action: "MINISTRY_DELETED",
      entity: "ministry",
      entityId: id
    });
  }
}

export const ministryService = new MinistryService();
