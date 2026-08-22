import { Prisma } from "@prisma/client";

import { prisma } from "../../lib/prisma";
import { registrationLotFallback } from "../../utils/registration-lot-fallback";
import { AppError } from "../../utils/errors";

export type AdminRegistrationsReportFilters = {
  districtId?: string;
  eventId?: string;
  lotId?: string;
  churchId?: string;
  startDate?: string;
  endDate?: string;
  ministryIds?: string[];
};

export type AdminRegistrationsReportItem = {
  districtId: string | null;
  districtName: string;
  eventId: string | null;
  eventTitle: string;
  lotId: string | null;
  lotName: string;
  registrationsCount: number;
};

export type AdminRegistrationsReportTotals = {
  total: number;
  byDistrict: Array<{ id: string | null; name: string; count: number }>;
  byEvent: Array<{ id: string | null; name: string; count: number; districtId?: string | null; districtName?: string }>;
  byLot: Array<{ id: string | null; name: string; count: number; eventId?: string | null; eventTitle?: string }>;
};

export type AdminRegistrationsReportPayload = {
  generatedAt: string;
  filters: {
    districtId?: string;
    districtName?: string | null;
    eventId?: string;
    eventTitle?: string | null;
    lotId?: string;
    lotName?: string | null;
    startDate?: string;
    endDate?: string;
  };
  items: AdminRegistrationsReportItem[];
  totals: AdminRegistrationsReportTotals;
};

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const parseDateInput = (value: string, mode: "start" | "end") => {
  const trimmed = value.trim();
  if (!trimmed) return null;

  let parsed: Date;
  if (DATE_ONLY_REGEX.test(trimmed)) {
    const [year, month, day] = trimmed.split("-").map((part) => Number(part));
    parsed = new Date(Date.UTC(year, month - 1, day));
    if (mode === "end") {
      parsed.setUTCHours(23, 59, 59, 999);
    }
  } else {
    parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) {
      throw new AppError("Data inválida.", 400);
    }
  }

  if (Number.isNaN(parsed.getTime())) {
    throw new AppError("Data inválida.", 400);
  }

  if (mode === "start" && DATE_ONLY_REGEX.test(trimmed)) {
    parsed.setUTCHours(0, 0, 0, 0);
  }

  return parsed;
};

const normalizeFilters = (filters: AdminRegistrationsReportFilters) => {
  const startDateRaw = filters.startDate?.trim();
  const endDateRaw = filters.endDate?.trim();
  const startDate = startDateRaw ? parseDateInput(startDateRaw, "start") : null;
  const endDate = endDateRaw ? parseDateInput(endDateRaw, "end") : null;

  if (startDate && endDate && startDate.getTime() > endDate.getTime()) {
    throw new AppError("Data inicial não pode ser maior que a data final.", 400);
  }

  return {
    startDate,
    endDate,
    startDateRaw: startDateRaw || undefined,
    endDateRaw: endDateRaw || undefined
  };
};

const resolveFilterNames = async (filters: AdminRegistrationsReportFilters) => {
  const [district, event, lot] = await Promise.all([
    filters.districtId
      ? prisma.district.findUnique({ where: { id: filters.districtId }, select: { name: true } })
      : null,
    filters.eventId
      ? prisma.event.findUnique({ where: { id: filters.eventId }, select: { title: true } })
      : null,
    filters.lotId
      ? prisma.eventLot.findUnique({ where: { id: filters.lotId }, select: { name: true } })
      : null
  ]);

  return {
    districtName: district?.name ?? null,
    eventTitle: event?.title ?? null,
    lotName: lot?.name ?? null
  };
};

const safeCount = (value: unknown) => {
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return Number(value ?? 0) || 0;
};

const buildTotals = (items: AdminRegistrationsReportItem[]): AdminRegistrationsReportTotals => {
  const byDistrict = new Map<string, { id: string | null; name: string; count: number }>();
  const byEvent = new Map<string, { id: string | null; name: string; count: number; districtId?: string | null; districtName?: string }>();
  const byLot = new Map<string, { id: string | null; name: string; count: number; eventId?: string | null; eventTitle?: string }>();

  let total = 0;

  items.forEach((item) => {
    const count = item.registrationsCount;
    total += count;

    const districtKey = item.districtId ?? "UNKNOWN";
    const districtEntry = byDistrict.get(districtKey) ?? {
      id: item.districtId ?? null,
      name: item.districtName,
      count: 0
    };
    districtEntry.count += count;
    byDistrict.set(districtKey, districtEntry);

    const eventKey = item.eventId ?? "UNKNOWN";
    const eventEntry = byEvent.get(eventKey) ?? {
      id: item.eventId ?? null,
      name: item.eventTitle,
      count: 0,
      districtId: item.districtId ?? null,
      districtName: item.districtName
    };
    eventEntry.count += count;
    byEvent.set(eventKey, eventEntry);

    const lotKey = item.lotId ?? `UNKNOWN-${item.eventId ?? ""}`;
    const lotEntry = byLot.get(lotKey) ?? {
      id: item.lotId ?? null,
      name: item.lotName,
      count: 0,
      eventId: item.eventId ?? null,
      eventTitle: item.eventTitle
    };
    lotEntry.count += count;
    byLot.set(lotKey, lotEntry);
  });

  const sortByCount = <T extends { count: number }>(list: T[]) =>
    list.sort((a, b) => b.count - a.count || String(a.count).localeCompare(String(b.count)));

  return {
    total,
    byDistrict: sortByCount(Array.from(byDistrict.values())),
    byEvent: sortByCount(Array.from(byEvent.values())),
    byLot: sortByCount(Array.from(byLot.values()))
  };
};

export const adminRegistrationsReportService = {
  async getReport(filters: AdminRegistrationsReportFilters): Promise<AdminRegistrationsReportPayload> {
    const normalized = normalizeFilters(filters);

    const whereParts: Prisma.Sql[] = [];
    if (filters.districtId) {
      whereParts.push(Prisma.sql`e.district_id = ${filters.districtId}`);
    }
    if (filters.eventId) {
      whereParts.push(Prisma.sql`e.id = ${filters.eventId}`);
    }
    if (filters.churchId) {
      whereParts.push(Prisma.sql`e.church_id = ${filters.churchId}`);
    }
    if (normalized.startDate) {
      whereParts.push(Prisma.sql`r.created_at >= ${normalized.startDate}`);
    }
    if (normalized.endDate) {
      whereParts.push(Prisma.sql`r.created_at <= ${normalized.endDate}`);
    }
    if (filters.ministryIds && filters.ministryIds.length) {
      whereParts.push(Prisma.sql`e.ministry_id IN (${Prisma.join(filters.ministryIds)})`);
    }

    const baseWhereParts = [...whereParts, registrationLotFallback.latestLotCondition];
    if (filters.lotId) {
      baseWhereParts.push(Prisma.sql`${registrationLotFallback.lotIdExpr} = ${filters.lotId}`);
    }

    const whereClause = baseWhereParts.length
      ? Prisma.sql`WHERE ${Prisma.join(baseWhereParts, " AND ")}`
      : Prisma.sql``;

    const rows = await prisma.$queryRaw<
      Array<{
        districtId: string | null;
        districtName: string | null;
        eventId: string | null;
        eventTitle: string | null;
        lotId: string | null;
        lotName: string | null;
        registrationsCount: bigint | number;
      }>
    >(Prisma.sql`
      SELECT
        d.id AS districtId,
        d.name AS districtName,
        e.id AS eventId,
        e.title AS eventTitle,
        ${registrationLotFallback.lotIdExpr} AS lotId,
        ${registrationLotFallback.lotNameExpr} AS lotName,
        COUNT(r.id) AS registrationsCount
      FROM registrations r
      INNER JOIN events e ON e.id = r.event_id
      INNER JOIN districts d ON d.id = e.district_id
      LEFT JOIN orders o ON o.id = r.order_id
      LEFT JOIN event_lots el ON el.id = o.pricing_lot_id
      ${registrationLotFallback.joinSql}
      ${whereClause}
      GROUP BY
        d.id,
        d.name,
        e.id,
        e.title,
        ${registrationLotFallback.lotIdExpr},
        ${registrationLotFallback.lotNameExpr}
      ORDER BY d.name ASC, e.title ASC, lotName ASC
    `);

    const items: AdminRegistrationsReportItem[] = rows.map((row) => ({
      districtId: row.districtId ?? null,
      districtName: row.districtName ?? "Não informado",
      eventId: row.eventId ?? null,
      eventTitle: row.eventTitle ?? "Evento não informado",
      lotId: row.lotId ?? null,
      lotName: row.lotName ?? "Sem lote",
      registrationsCount: safeCount(row.registrationsCount)
    }));

    const totals = buildTotals(items);
    const filterNames = await resolveFilterNames(filters);

    return {
      generatedAt: new Date().toISOString(),
      filters: {
        districtId: filters.districtId,
        districtName: filterNames.districtName,
        eventId: filters.eventId,
        eventTitle: filterNames.eventTitle,
        lotId: filters.lotId,
        lotName: filterNames.lotName,
        startDate: normalized.startDateRaw,
        endDate: normalized.endDateRaw
      },
      items,
      totals
    };
  }
};
