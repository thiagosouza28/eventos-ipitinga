import { prisma } from "../../lib/prisma";
import { NotFoundError } from "../../utils/errors";
import { auditService } from "../../services/audit.service";

const normalizeString = (value: unknown): string | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
  }
  if (typeof value === "object") {
    const maybeValue = value as Record<string, unknown>;
    if ("value" in maybeValue && typeof maybeValue.value === "string") {
      const trimmed = maybeValue.value.trim();
      return trimmed.length ? trimmed : undefined;
    }
    if ("name" in maybeValue && typeof maybeValue.name === "string") {
      const trimmed = maybeValue.name.trim();
      return trimmed.length ? trimmed : undefined;
    }
    const stringified = JSON.stringify(maybeValue).replace(/^"|"$/g, "").trim();
    return stringified.length ? stringified : undefined;
  }
  const converted = String(value).trim();
  return converted.length ? converted : undefined;
};

export class DistrictService {
  async list() {
    const districts = await prisma.district.findMany({
      orderBy: {
        name: "asc"
      }
    });
    return districts.map((district) => ({
      id: district.id,
      name: district.name,
      pastorName: district.pastorName ?? null,
      createdAt: district.createdAt
    }));
  }

  async create(data: { name: unknown; pastorName?: unknown }, actorId?: string) {
    const name = normalizeString(data.name);
    if (!name) {
      throw new Error("Nome deve ser uma string válida");
    }
    const pastorName = normalizeString(data.pastorName);
    const district = await prisma.district.create({
      data: {
        name,
        pastorName: pastorName ?? null
      }
    });
    await auditService.log({
      actorUserId: actorId,
      action: "DISTRICT_CREATED",
      entity: "district",
      entityId: district.id,
      metadata: {
        name,
        pastorName: pastorName ?? null
      }
    });
    return {
      id: district.id,
      name: district.name,
      pastorName: district.pastorName ?? null,
      createdAt: district.createdAt
    };
  }

  async update(id: string, data: { name?: unknown; pastorName?: unknown }, actorId?: string) {
    const existing = await prisma.district.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError("Distrito nao encontrado");
    }
    const payload: { name?: string; pastorName?: string | null } = {};
    if (data.name !== undefined) {
      const normalized = normalizeString(data.name);
      if (!normalized) {
        throw new Error("Nome deve ser uma string válida");
      }
      payload.name = normalized;
    }
    if (data.pastorName !== undefined) {
      const normalized = normalizeString(data.pastorName);
      payload.pastorName = normalized ?? null;
    }
    if (!Object.keys(payload).length) {
      return {
        id: existing.id,
        name: existing.name,
        pastorName: existing.pastorName ?? null,
        createdAt: existing.createdAt
      };
    }
    const district = await prisma.district.update({
      where: { id },
      data: payload
    });
    await auditService.log({
      actorUserId: actorId,
      action: "DISTRICT_UPDATED",
      entity: "district",
      entityId: district.id,
      metadata: payload
    });
    return {
      id: district.id,
      name: district.name,
      pastorName: district.pastorName ?? null,
      createdAt: district.createdAt
    };
  }

  async delete(id: string, actorId?: string) {
    const district = await prisma.district.findUnique({
      where: { id },
      include: {
        churches: {
          select: {
            id: true
          }
        }
      }
    });
    if (!district) {
      throw new NotFoundError("Distrito nao encontrado");
    }
    if (district.churches.length > 0) {
      throw new Error("Nao e possivel excluir distrito com igrejas vinculadas");
    }
    await prisma.district.delete({
      where: { id }
    });
    await auditService.log({
      action: "DISTRICT_DELETED",
      entity: "district",
      entityId: district.id,
      actorUserId: actorId,
      metadata: {
        name: district.name
      }
    });
    return { success: true };
  }
}

export const districtService = new DistrictService();
