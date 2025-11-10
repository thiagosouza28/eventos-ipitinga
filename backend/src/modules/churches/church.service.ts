import { prisma } from "../../lib/prisma";
import { NotFoundError } from "../../utils/errors";
import { auditService } from "../../services/audit.service";
import { sanitizeCpf } from "../../utils/mask";

const normalizeString = (value: unknown): string | undefined => {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if ("value" in record && typeof record.value === "string") {
      const trimmed = record.value.trim();
      if (trimmed.length) return trimmed;
    }
    if ("name" in record && typeof record.name === "string") {
      const trimmed = record.name.trim();
      if (trimmed.length) return trimmed;
    }
    const stringified = JSON.stringify(record).replace(/^"|"$/g, "").trim();
    return stringified.length ? stringified : undefined;
  }
  const converted = String(value).trim();
  return converted.length ? converted : undefined;
};

const parseBirthDate = (value: unknown): Date | undefined => {
  if (value === undefined || value === null) return undefined;
  if (value instanceof Date) return value;
  const normalized = normalizeString(value);
  if (!normalized) return undefined;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Data de nascimento inválida");
  }
  return date;
};

const normalizeCpf = (value: unknown): string | null => {
  const normalized = normalizeString(value);
  if (!normalized) return null;
  const digits = sanitizeCpf(normalized);
  return digits.length ? digits : null;
};

export class ChurchService {
  async list(districtId?: string) {
    const where = districtId ? { districtId } : undefined;
    const churches = await prisma.church.findMany({
      where,
      include: {
        district: true
      },
      orderBy: {
        name: "asc"
      }
    });
    return churches.map((church) => ({
      id: church.id,
      name: church.name,
      districtId: church.districtId,
      directorName: church.directorName ?? null,
      directorCpf: church.directorCpf ?? null,
      directorBirthDate: church.directorBirthDate ?? null,
      directorEmail: church.directorEmail ?? null,
      directorWhatsapp: church.directorWhatsapp ?? null,
      directorPhotoUrl: church.directorPhotoUrl ?? null,
      createdAt: church.createdAt,
      district: church.district
        ? {
            id: church.district.id,
            name: church.district.name,
            pastorName: church.district.pastorName ?? null,
            createdAt: church.district.createdAt
          }
        : null
    }));
  }

  async create(data: {
    name: unknown;
    districtId: unknown;
    directorName?: unknown;
    directorCpf?: unknown;
    directorBirthDate?: unknown;
    directorEmail?: unknown;
    directorWhatsapp?: unknown;
    directorPhotoUrl?: unknown;
  }, actorId?: string) {
    const name = normalizeString(data.name);
    if (!name) throw new Error("Nome da igreja é obrigatório");
    const districtId = normalizeString(data.districtId);
    if (!districtId) throw new Error("Distrito associado é obrigatório");
    const district = await prisma.district.findUnique({ where: { id: districtId } });
    if (!district) throw new NotFoundError("Distrito não encontrado");
    const church = await prisma.church.create({
      data: {
        name,
        districtId,
        directorName: normalizeString(data.directorName) ?? null,
        directorCpf: normalizeCpf(data.directorCpf),
        directorBirthDate: parseBirthDate(data.directorBirthDate) ?? null,
        directorEmail: normalizeString(data.directorEmail) ?? null,
        directorWhatsapp: normalizeString(data.directorWhatsapp) ?? null,
        directorPhotoUrl: normalizeString(data.directorPhotoUrl) ?? null
      }
    });
    await auditService.log({
      actorUserId: actorId,
      action: "CHURCH_CREATED",
      entity: "church",
      entityId: church.id,
      metadata: {
        name,
        districtId
      }
    });
    return {
      id: church.id,
      name: church.name,
      districtId: church.districtId,
      directorName: church.directorName ?? null,
      directorCpf: church.directorCpf ?? null,
      directorBirthDate: church.directorBirthDate ?? null,
      directorEmail: church.directorEmail ?? null,
      directorWhatsapp: church.directorWhatsapp ?? null,
      directorPhotoUrl: church.directorPhotoUrl ?? null,
      createdAt: church.createdAt,
      district: {
        id: district.id,
        name: district.name,
        pastorName: district.pastorName ?? null,
        createdAt: district.createdAt
      }
    };
  }

  async update(
    id: string,
    data: {
      name?: unknown;
      districtId?: unknown;
      directorName?: unknown;
      directorCpf?: unknown;
      directorBirthDate?: unknown;
      directorEmail?: unknown;
      directorWhatsapp?: unknown;
      directorPhotoUrl?: unknown;
    },
    actorId?: string
  ) {
    const existing = await prisma.church.findUnique({
      where: { id },
      include: { district: true }
    });
    if (!existing) throw new NotFoundError("Igreja não encontrada");
    const updateData: {
      name?: string;
      districtId?: string;
      directorName?: string | null;
      directorCpf?: string | null;
      directorBirthDate?: Date | null;
      directorEmail?: string | null;
      directorWhatsapp?: string | null;
      directorPhotoUrl?: string | null;
    } = {};
    if (data.name !== undefined) {
      const normalized = normalizeString(data.name);
      if (!normalized) throw new Error("Nome da igreja deve ser válido");
      updateData.name = normalized;
    }
    if (data.districtId !== undefined) {
      const normalized = normalizeString(data.districtId);
      if (!normalized) throw new Error("Distrito associado é obrigatório");
      const district = await prisma.district.findUnique({ where: { id: normalized } });
      if (!district) throw new NotFoundError("Distrito não encontrado");
      updateData.districtId = normalized;
    }
    if (data.directorName !== undefined) {
      updateData.directorName = normalizeString(data.directorName) ?? null;
    }
    if (data.directorCpf !== undefined) {
      updateData.directorCpf = normalizeCpf(data.directorCpf);
    }
    if (data.directorBirthDate !== undefined) {
      updateData.directorBirthDate = parseBirthDate(data.directorBirthDate) ?? null;
    }
    if (data.directorEmail !== undefined) {
      updateData.directorEmail = normalizeString(data.directorEmail) ?? null;
    }
    if (data.directorWhatsapp !== undefined) {
      updateData.directorWhatsapp = normalizeString(data.directorWhatsapp) ?? null;
    }
    if (data.directorPhotoUrl !== undefined) {
      updateData.directorPhotoUrl = normalizeString(data.directorPhotoUrl) ?? null;
    }
    if (!Object.keys(updateData).length) {
      return {
        id: existing.id,
        name: existing.name,
        districtId: existing.districtId,
        directorName: existing.directorName ?? null,
        directorCpf: existing.directorCpf ?? null,
        directorBirthDate: existing.directorBirthDate ?? null,
        directorEmail: existing.directorEmail ?? null,
        directorWhatsapp: existing.directorWhatsapp ?? null,
        directorPhotoUrl: existing.directorPhotoUrl ?? null,
        createdAt: existing.createdAt,
        district: {
          id: existing.districtId,
          name: existing.district?.name ?? "",
          pastorName: existing.district?.pastorName ?? null,
          createdAt: existing.district?.createdAt ?? new Date()
        }
      };
    }
    const church = await prisma.church.update({
      where: { id },
      data: updateData,
      include: {
        district: true
      }
    });
    await auditService.log({
      actorUserId: actorId,
      action: "CHURCH_UPDATED",
      entity: "church",
      entityId: church.id,
      metadata: updateData
    });
    return {
      id: church.id,
      name: church.name,
      districtId: church.districtId,
      directorName: church.directorName ?? null,
      directorCpf: church.directorCpf ?? null,
      directorBirthDate: church.directorBirthDate ?? null,
      directorEmail: church.directorEmail ?? null,
      directorWhatsapp: church.directorWhatsapp ?? null,
      directorPhotoUrl: church.directorPhotoUrl ?? null,
      createdAt: church.createdAt,
      district: church.district
        ? {
            id: church.district.id,
            name: church.district.name,
            pastorName: church.district.pastorName ?? null,
            createdAt: church.district.createdAt
          }
        : null
    };
  }

  async findByDirectorCpf(cpf: string) {
    const sanitized = sanitizeCpf(cpf);
    if (!sanitized) return null;
    const church = await prisma.church.findFirst({
      where: { directorCpf: sanitized },
      include: { district: true }
    });
    if (!church) return null;
    return {
      churchId: church.id,
      churchName: church.name,
      districtId: church.districtId,
      districtName: church.district?.name ?? null,
      directorName: church.directorName ?? null
    };
  }

  async delete(id: string, actorId?: string) {
    const church = await prisma.church.findUnique({
      where: { id },
      include: {
        registrations: {
          select: {
            id: true
          }
        }
      }
    });
    if (!church) throw new NotFoundError("Igreja não encontrada");
    if (church.registrations.length > 0) {
      throw new Error("Nao e possivel excluir igreja com registros vinculados");
    }
    await prisma.church.delete({ where: { id } });
    await auditService.log({
      action: "CHURCH_DELETED",
      entity: "church",
      entityId: church.id,
      actorUserId: actorId,
      metadata: {
        name: church.name,
        districtId: church.districtId
      }
    });
    return { success: true };
  }
}

export const churchService = new ChurchService();
