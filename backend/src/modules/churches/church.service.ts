import { prisma } from "../../lib/prisma";
import { NotFoundError } from "../../utils/errors";
import { auditService } from "../../services/audit.service";

export class ChurchService {
  list(districtId?: string) {
    return prisma.church.findMany({
      where: districtId ? { districtId } : undefined,
      include: { district: true },
      orderBy: { name: "asc" }
    });
  }

  async create(data: { name: string; districtId: string }, actorId?: string) {
    const church = await prisma.church.create({
      data
    });
    await auditService.log({
      actorUserId: actorId,
      action: "CHURCH_CREATED",
      entity: "church",
      entityId: church.id,
      metadata: data
    });
    return church;
  }

  async update(id: string, data: { name?: string; districtId?: string }, actorId?: string) {
    const exists = await prisma.church.findUnique({ where: { id } });
    if (!exists) throw new NotFoundError("Igreja nao encontrada");
    const church = await prisma.church.update({ where: { id }, data });
    await auditService.log({
      actorUserId: actorId,
      action: "CHURCH_UPDATED",
      entity: "church",
      entityId: id,
      metadata: data
    });
    return church;
  }
}

export const churchService = new ChurchService();
