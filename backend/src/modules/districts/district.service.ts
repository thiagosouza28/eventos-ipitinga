import { prisma } from "../../lib/prisma";
import { NotFoundError } from "../../utils/errors";
import { auditService } from "../../services/audit.service";

export class DistrictService {
  list() {
    return prisma.district.findMany({
      orderBy: { name: "asc" }
    });
  }

  async create(name: string, actorId?: string) {
    const district = await prisma.district.create({ data: { name } });
    await auditService.log({
      actorUserId: actorId,
      action: "DISTRICT_CREATED",
      entity: "district",
      entityId: district.id,
      metadata: { name }
    });
    return district;
  }

  async update(id: string, name: string, actorId?: string) {
    const exists = await prisma.district.findUnique({ where: { id } });
    if (!exists) throw new NotFoundError("Distrito nao encontrado");
    const district = await prisma.district.update({ where: { id }, data: { name } });
    await auditService.log({
      actorUserId: actorId,
      action: "DISTRICT_UPDATED",
      entity: "district",
      entityId: id,
      metadata: { name }
    });
    return district;
  }
}

export const districtService = new DistrictService();
