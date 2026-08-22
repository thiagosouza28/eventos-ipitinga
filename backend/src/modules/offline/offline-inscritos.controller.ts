import type { Prisma } from "@prisma/client";
import type { Request, Response } from "express";
import { z } from "zod";

import { prisma } from "../../lib/prisma";
import { NotFoundError } from "../../utils/errors";
import { getPublicAssetBaseUrl } from "../../utils/public-url";
import { getScopedMinistryIds } from "../../utils/user-scope";

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(500),
  updatedAfter: z.string().datetime({ offset: true }).optional()
});

const buildScopeWhere = (user?: Request["user"]): Prisma.RegistrationWhereInput => {
  const where: Prisma.RegistrationWhereInput = {};
  if (!user || user.role === "AdminGeral") return where;

  if (user.role === "DiretorLocal") {
    if (user.churchId) where.churchId = user.churchId;
    if (user.districtScopeId) where.districtId = user.districtScopeId;
  } else if (user.role === "AdminDistrital" && user.districtScopeId) {
    where.districtId = user.districtScopeId;
  }

  const ministryIds = getScopedMinistryIds(user);
  if (ministryIds?.length) where.ministryId = { in: ministryIds };
  return where;
};

const toPublicPhotoUrl = (value?: string | null) => {
  if (!value) return null;
  if (/^(?:data:|https?:\/\/)/i.test(value)) return value;
  const cleanPath = value.replace(/^\/+/, "");
  if (!cleanPath) return null;
  const base = getPublicAssetBaseUrl();
  return cleanPath.startsWith("uploads/") ? `${base}/${cleanPath}` : `${base}/uploads/${cleanPath}`;
};

const latestDate = (...values: Array<Date | null | undefined>) => {
  const timestamps = values.filter((value): value is Date => value instanceof Date).map((value) => value.getTime());
  return new Date(Math.max(...timestamps));
};

type OfflineRegistration = Prisma.RegistrationGetPayload<{
  include: {
    church: { select: { id: true; name: true } };
    district: { select: { id: true; name: true } };
    event: { select: { id: true; title: true; slug: true } };
  };
}>;

const serializeRegistration = (registration: OfflineRegistration, auditDate?: Date | null) => {
  const updatedAt = latestDate(
    registration.createdAt,
    registration.paidAt,
    registration.checkinAt,
    auditDate
  );

  return {
    id: registration.id,
    numero: registration.id,
    number: registration.id,
    registrationNumber: registration.id,
    nome: registration.fullName,
    fullName: registration.fullName,
    cpf: registration.cpf,
    dataNascimento: registration.birthDate.toISOString().slice(0, 10),
    birthDate: registration.birthDate.toISOString(),
    idade: registration.ageYears,
    ageYears: registration.ageYears,
    igreja: registration.church.name,
    igrejaId: registration.church.id,
    church: registration.church.name,
    churchId: registration.church.id,
    distrito: registration.district.name,
    distritoId: registration.district.id,
    district: registration.district.name,
    districtId: registration.district.id,
    evento: registration.event.title,
    eventId: registration.event.id,
    eventTitle: registration.event.title,
    eventSlug: registration.event.slug,
    status: registration.status,
    genero: registration.gender,
    gender: registration.gender,
    photoUrl: toPublicPhotoUrl(registration.photoUrl),
    paymentMethod: registration.paymentMethod,
    paidAt: registration.paidAt?.toISOString() ?? null,
    checkinAt: registration.checkinAt?.toISOString() ?? null,
    createdAt: registration.createdAt.toISOString(),
    updatedAt: updatedAt.toISOString()
  };
};

const loadAuditDates = async (registrationIds: string[], updatedAfter?: Date) => {
  if (!registrationIds.length) return new Map<string, Date>();
  const logs = await prisma.auditLog.findMany({
    where: {
      entity: "registration",
      entityId: { in: registrationIds },
      ...(updatedAfter ? { createdAt: { gte: updatedAfter } } : {})
    },
    select: { entityId: true, createdAt: true },
    orderBy: { createdAt: "asc" }
  });
  const dates = new Map<string, Date>();
  logs.forEach((log) => dates.set(log.entityId, log.createdAt));
  return dates;
};

export const listOfflineInscritosHandler = async (request: Request, response: Response) => {
  const { page, limit, updatedAfter } = listQuerySchema.parse(request.query);
  const changedSince = updatedAfter ? new Date(updatedAfter) : undefined;
  const scopeWhere = buildScopeWhere(request.user);

  let auditedIds: string[] = [];
  if (changedSince) {
    const logs = await prisma.auditLog.findMany({
      where: { entity: "registration", createdAt: { gte: changedSince } },
      select: { entityId: true },
      distinct: ["entityId"]
    });
    auditedIds = logs.map((log) => log.entityId);
  }

  const where: Prisma.RegistrationWhereInput = changedSince
    ? {
        AND: [
          scopeWhere,
          {
            OR: [
              { createdAt: { gte: changedSince } },
              { paidAt: { gte: changedSince } },
              { checkinAt: { gte: changedSince } },
              ...(auditedIds.length ? [{ id: { in: auditedIds } }] : [])
            ]
          }
        ]
      }
    : scopeWhere;

  const [items, total] = await Promise.all([
    prisma.registration.findMany({
      where,
      include: {
        church: { select: { id: true, name: true } },
        district: { select: { id: true, name: true } },
        event: { select: { id: true, title: true, slug: true } }
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.registration.count({ where })
  ]);

  const auditDates = await loadAuditDates(items.map((item) => item.id), changedSince);
  const serialized = items.map((item) => serializeRegistration(item, auditDates.get(item.id)));
  const totalPages = total ? Math.ceil(total / limit) : 0;

  return response.json({
    items: serialized,
    data: serialized,
    inscritos: serialized,
    page,
    limit,
    pageSize: limit,
    total,
    totalPages,
    hasMore: page < totalPages,
    nextPage: page < totalPages ? page + 1 : null,
    updatedAfter: updatedAfter ?? null,
    synchronizedAt: new Date().toISOString()
  });
};

export const getOfflineInscritoHandler = async (request: Request, response: Response) => {
  const numero = String(request.params.numero ?? "").trim();
  if (!numero) throw new NotFoundError("Inscrito não encontrado");

  const digits = numero.replace(/\D/g, "");
  const scopeWhere = buildScopeWhere(request.user);
  const registration = await prisma.registration.findFirst({
    where: {
      AND: [
        scopeWhere,
        {
          OR: [
            { id: numero },
            ...(digits.length === 11 ? [{ cpf: digits }] : [])
          ]
        }
      ]
    },
    include: {
      church: { select: { id: true, name: true } },
      district: { select: { id: true, name: true } },
      event: { select: { id: true, title: true, slug: true } }
    },
    orderBy: { createdAt: "desc" }
  });

  if (!registration) throw new NotFoundError("Inscrito não encontrado");
  const auditDates = await loadAuditDates([registration.id]);
  return response.json(serializeRegistration(registration, auditDates.get(registration.id)));
};
