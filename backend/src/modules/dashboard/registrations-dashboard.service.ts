import { Prisma } from "@/prisma/generated/client";

import { prisma } from "../../lib/prisma";
import { registrationLotFallback } from "../../utils/registration-lot-fallback";
import { AppError } from "../../utils/errors";

export type RegistrationDashboardFilters = {
  eventId?: string;
  districtId?: string;
  churchId?: string;
  startDate?: string;
  endDate?: string;
  ministryIds?: string[];
};

export type RegistrationDashboardSummary = {
  totalRegistrations: number;
  districtsCount: number;
  churchesCount: number;
  lotsCount: number;
};

export type RegistrationDashboardDistrict = {
  districtId: string | null;
  districtName: string;
  registrationsCount: number;
  confirmedCount: number;
  pendingCount: number;
  canceledCount: number;
};

export type RegistrationDashboardChurch = {
  churchId: string | null;
  churchName: string;
  districtId: string | null;
  districtName: string;
  registrationsCount: number;
  confirmedCount: number;
  pendingCount: number;
  canceledCount: number;
};

export type RegistrationDashboardLot = {
  lotId: string | null;
  lotName: string;
  eventId: string | null;
  eventTitle: string;
  registrationsCount: number;
  confirmedCount: number;
  pendingCount: number;
  canceledCount: number;
};

export type RegistrationDashboardPayload = {
  generatedAt: string;
  filters: {
    eventId?: string;
    startDate?: string;
    endDate?: string;
  };
  summary: RegistrationDashboardSummary;
  byDistrict: RegistrationDashboardDistrict[];
  byChurch: RegistrationDashboardChurch[];
  byLot: RegistrationDashboardLot[];
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
  }

  if (Number.isNaN(parsed.getTime())) {
    throw new AppError("Data invalida.", 400);
  }

  if (mode === "start" && DATE_ONLY_REGEX.test(trimmed)) {
    parsed.setUTCHours(0, 0, 0, 0);
  }

  return parsed;
};

const normalizeFilters = (filters: RegistrationDashboardFilters) => {
  const startDateRaw = filters.startDate?.trim();
  const endDateRaw = filters.endDate?.trim();
  const startDate = startDateRaw ? parseDateInput(startDateRaw, "start") : null;
  const endDate = endDateRaw ? parseDateInput(endDateRaw, "end") : null;

  if (startDate && endDate && startDate.getTime() > endDate.getTime()) {
    throw new AppError("Data inicial nao pode ser maior que a data final.", 400);
  }

  return {
    startDate,
    endDate,
    startDateRaw: startDateRaw || undefined,
    endDateRaw: endDateRaw || undefined
  };
};

const safeCount = (value: unknown) => {
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return Number(value ?? 0) || 0;
};

export const registrationsDashboardService = {
  async getMetrics(filters: RegistrationDashboardFilters): Promise<RegistrationDashboardPayload> {
    const normalized = normalizeFilters(filters);

    const whereParts: Prisma.Sql[] = [];
    if (filters.eventId) {
      whereParts.push(Prisma.sql`r.eventId = ${filters.eventId}`);
    }
    if (filters.districtId) {
      whereParts.push(Prisma.sql`r.districtId = ${filters.districtId}`);
    }
    if (filters.churchId) {
      whereParts.push(Prisma.sql`r.churchId = ${filters.churchId}`);
    }
    if (normalized.startDate) {
      whereParts.push(Prisma.sql`r.createdAt >= ${normalized.startDate}`);
    }
    if (normalized.endDate) {
      whereParts.push(Prisma.sql`r.createdAt <= ${normalized.endDate}`);
    }
    if (filters.ministryIds && filters.ministryIds.length) {
      whereParts.push(Prisma.sql`r.ministryId IN (${Prisma.join(filters.ministryIds)})`);
    }

    const whereClause = whereParts.length
      ? Prisma.sql`WHERE ${Prisma.join(whereParts, " AND ")}`
      : Prisma.sql``;

    const totalRows = await prisma.$queryRaw<Array<{ total: bigint | number }>>(Prisma.sql`
      SELECT COUNT(r.id) AS total
      FROM Registration r
      ${whereClause}
    `);

    const byDistrictRows = await prisma.$queryRaw<
      Array<{
        districtId: string | null;
        districtName: string | null;
        confirmedCount: bigint | number;
        pendingCount: bigint | number;
        canceledCount: bigint | number;
        totalCount: bigint | number;
      }>
    >(Prisma.sql`
      SELECT
        r.districtId AS districtId,
        d.name AS districtName,
        SUM(CASE WHEN r.status IN ('PAID', 'CHECKED_IN') THEN 1 ELSE 0 END) AS confirmedCount,
        SUM(CASE WHEN r.status IN ('PENDING_PAYMENT', 'DRAFT') THEN 1 ELSE 0 END) AS pendingCount,
        SUM(CASE WHEN r.status IN ('CANCELED', 'REFUNDED') THEN 1 ELSE 0 END) AS canceledCount,
        (
          SUM(CASE WHEN r.status IN ('PAID', 'CHECKED_IN') THEN 1 ELSE 0 END)
          + SUM(CASE WHEN r.status IN ('PENDING_PAYMENT', 'DRAFT') THEN 1 ELSE 0 END)
          + SUM(CASE WHEN r.status IN ('CANCELED', 'REFUNDED') THEN 1 ELSE 0 END)
        ) AS totalCount
      FROM Registration r
      INNER JOIN District d ON d.id = r.districtId
      ${whereClause}
      GROUP BY r.districtId, d.name
      ORDER BY totalCount DESC, d.name ASC
    `);

    const byChurchRows = await prisma.$queryRaw<
      Array<{
        churchId: string | null;
        churchName: string | null;
        districtId: string | null;
        districtName: string | null;
        confirmedCount: bigint | number;
        pendingCount: bigint | number;
        canceledCount: bigint | number;
        totalCount: bigint | number;
      }>
    >(Prisma.sql`
      SELECT
        r.churchId AS churchId,
        c.name AS churchName,
        c.districtId AS districtId,
        d.name AS districtName,
        SUM(CASE WHEN r.status IN ('PAID', 'CHECKED_IN') THEN 1 ELSE 0 END) AS confirmedCount,
        SUM(CASE WHEN r.status IN ('PENDING_PAYMENT', 'DRAFT') THEN 1 ELSE 0 END) AS pendingCount,
        SUM(CASE WHEN r.status IN ('CANCELED', 'REFUNDED') THEN 1 ELSE 0 END) AS canceledCount,
        (
          SUM(CASE WHEN r.status IN ('PAID', 'CHECKED_IN') THEN 1 ELSE 0 END)
          + SUM(CASE WHEN r.status IN ('PENDING_PAYMENT', 'DRAFT') THEN 1 ELSE 0 END)
          + SUM(CASE WHEN r.status IN ('CANCELED', 'REFUNDED') THEN 1 ELSE 0 END)
        ) AS totalCount
      FROM Registration r
      INNER JOIN Church c ON c.id = r.churchId
      INNER JOIN District d ON d.id = c.districtId
      ${whereClause}
      GROUP BY r.churchId, c.name, c.districtId, d.name
      ORDER BY totalCount DESC, c.name ASC
    `);

    const baseWhereParts = [...whereParts, registrationLotFallback.latestLotCondition];
    const lotWhereClause = baseWhereParts.length
      ? Prisma.sql`WHERE ${Prisma.join(baseWhereParts, " AND ")}`
      : Prisma.sql``;

    const byLotRows = await prisma.$queryRaw<
      Array<{
        lotId: string | null;
        lotName: string | null;
        eventId: string | null;
        eventTitle: string | null;
        confirmedCount: bigint | number;
        pendingCount: bigint | number;
        canceledCount: bigint | number;
        totalCount: bigint | number;
      }>
    >(Prisma.sql`
      SELECT
        ${registrationLotFallback.lotIdExpr} AS lotId,
        ${registrationLotFallback.lotNameExpr} AS lotName,
        e.id AS eventId,
        e.title AS eventTitle,
        SUM(CASE WHEN r.status IN ('PAID', 'CHECKED_IN') THEN 1 ELSE 0 END) AS confirmedCount,
        SUM(CASE WHEN r.status IN ('PENDING_PAYMENT', 'DRAFT') THEN 1 ELSE 0 END) AS pendingCount,
        SUM(CASE WHEN r.status IN ('CANCELED', 'REFUNDED') THEN 1 ELSE 0 END) AS canceledCount,
        (
          SUM(CASE WHEN r.status IN ('PAID', 'CHECKED_IN') THEN 1 ELSE 0 END)
          + SUM(CASE WHEN r.status IN ('PENDING_PAYMENT', 'DRAFT') THEN 1 ELSE 0 END)
          + SUM(CASE WHEN r.status IN ('CANCELED', 'REFUNDED') THEN 1 ELSE 0 END)
        ) AS totalCount
      FROM Registration r
      INNER JOIN Event e ON e.id = r.eventId
      LEFT JOIN \`Order\` o ON o.id = r.orderId
      LEFT JOIN EventLot el ON el.id = o.pricingLotId
      ${registrationLotFallback.joinSql}
      ${lotWhereClause}
      GROUP BY lotId, lotName, e.id, e.title
      ORDER BY totalCount DESC, lotName ASC
    `);

    const byDistrict = byDistrictRows.map((row) => {
      const confirmedCount = safeCount(row.confirmedCount);
      const pendingCount = safeCount(row.pendingCount);
      const canceledCount = safeCount(row.canceledCount);
      const totalCount =
        row.totalCount !== undefined
          ? safeCount(row.totalCount)
          : confirmedCount + pendingCount + canceledCount;

      return {
        districtId: row.districtId ?? null,
        districtName: row.districtName ?? "Nao informado",
        confirmedCount,
        pendingCount,
        canceledCount,
        registrationsCount: totalCount
      };
    });

    const byChurch = byChurchRows.map((row) => {
      const confirmedCount = safeCount(row.confirmedCount);
      const pendingCount = safeCount(row.pendingCount);
      const canceledCount = safeCount(row.canceledCount);
      const totalCount =
        row.totalCount !== undefined
          ? safeCount(row.totalCount)
          : confirmedCount + pendingCount + canceledCount;

      return {
        churchId: row.churchId ?? null,
        churchName: row.churchName ?? "Nao informado",
        districtId: row.districtId ?? null,
        districtName: row.districtName ?? "Nao informado",
        confirmedCount,
        pendingCount,
        canceledCount,
        registrationsCount: totalCount
      };
    });

    const byLot = byLotRows.map((row) => {
      const confirmedCount = safeCount(row.confirmedCount);
      const pendingCount = safeCount(row.pendingCount);
      const canceledCount = safeCount(row.canceledCount);
      const totalCount =
        row.totalCount !== undefined
          ? safeCount(row.totalCount)
          : confirmedCount + pendingCount + canceledCount;

      return {
        lotId: row.lotId ?? null,
        lotName: row.lotName ?? "Sem lote",
        eventId: row.eventId ?? null,
        eventTitle: row.eventTitle ?? "Evento nao informado",
        confirmedCount,
        pendingCount,
        canceledCount,
        registrationsCount: totalCount
      };
    });

    const totalRegistrations = safeCount(totalRows[0]?.total ?? 0);

    return {
      generatedAt: new Date().toISOString(),
      filters: {
        eventId: filters.eventId,
        startDate: normalized.startDateRaw,
        endDate: normalized.endDateRaw
      },
      summary: {
        totalRegistrations,
        districtsCount: byDistrict.length,
        churchesCount: byChurch.length,
        lotsCount: byLot.length
      },
      byDistrict,
      byChurch,
      byLot
    };
  }
};
