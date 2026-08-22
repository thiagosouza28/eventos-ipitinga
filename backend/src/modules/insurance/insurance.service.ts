import type { Request } from "express";
import { Prisma } from "@prisma/client";

import { prisma } from "../../lib/prisma";
import { calculateEventInsuranceDays } from "../../utils/event-insurance";
import { RegistrationStatus } from "../../config/statuses";

type ActorUser = Request["user"];
type CoverageFilter = "all" | "insured" | "waived";
const activeCoverageStatuses: string[] = [RegistrationStatus.PAID, RegistrationStatus.CHECKED_IN];

const eventScope = (actor?: ActorUser): Prisma.EventWhereInput => {
  if (!actor || actor.role === "AdminGeral") return {};
  const where: Prisma.EventWhereInput = {};
  if (actor.ministryIds?.length) where.ministryId = { in: actor.ministryIds };
  if (actor.role === "AdminDistrital" && actor.districtScopeId) where.districtId = actor.districtScopeId;
  if (actor.role === "DiretorLocal" && actor.churchId) where.churchId = actor.churchId;
  return where;
};

export class InsuranceService {
  async list(
    filters: { eventId?: string; search?: string; coverage?: CoverageFilter; page?: number; pageSize?: number },
    actor?: ActorUser
  ) {
    const scopedEvents = await prisma.event.findMany({
      where: eventScope(actor),
      orderBy: { startDate: "desc" },
      select: {
        id: true,
        title: true,
        startDate: true,
        endDate: true,
        insuranceEnabled: true,
        insuranceRequired: true,
        insuranceDailyCents: true
      }
    });
    const scopedEventIds = scopedEvents.map((event) => event.id);
    const allowedEventIds = filters.eventId && scopedEventIds.includes(filters.eventId)
      ? [filters.eventId]
      : filters.eventId
        ? []
        : scopedEventIds;

    const baseWhere: Prisma.RegistrationWhereInput = {
      eventId: { in: allowedEventIds },
      ...(filters.search?.trim()
        ? {
            OR: [
              { fullName: { contains: filters.search.trim() } },
              { cpf: { contains: filters.search.replace(/\D/g, "") } }
            ]
          }
        : {})
    };
    const coverage = filters.coverage ?? "all";
    const listWhere: Prisma.RegistrationWhereInput = {
      ...baseWhere,
      ...(coverage === "insured"
        ? { insuranceSelected: true, status: { in: activeCoverageStatuses } }
        : coverage === "waived"
          ? { insuranceSelected: false, insuranceWaiverAccepted: true }
          : {})
    };
    const page = Math.max(filters.page ?? 1, 1);
    const pageSize = Math.min(Math.max(filters.pageSize ?? 25, 1), 100);

    const [registrations, total, totalRegistrations, insuredRegistrations, waivedRegistrations, revenue, grouped] =
      await Promise.all([
        prisma.registration.findMany({
          where: listWhere,
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
          include: {
            event: { select: { id: true, title: true } },
            district: { select: { id: true, name: true } },
            church: { select: { id: true, name: true } }
          }
        }),
        prisma.registration.count({ where: listWhere }),
        prisma.registration.count({ where: baseWhere }),
        prisma.registration.count({ where: { ...baseWhere, insuranceSelected: true, status: { in: activeCoverageStatuses } } }),
        prisma.registration.count({ where: { ...baseWhere, insuranceSelected: false, insuranceWaiverAccepted: true } }),
        prisma.registration.aggregate({ where: { ...baseWhere, insuranceSelected: true, status: { in: activeCoverageStatuses } }, _sum: { insuranceAmountCents: true } }),
        prisma.registration.groupBy({
          by: ["eventId", "insuranceSelected", "status"],
          where: { eventId: { in: scopedEventIds } },
          _count: { _all: true },
          _sum: { insuranceAmountCents: true }
        })
      ]);

    const eventStats = new Map<string, { total: number; insured: number; revenue: number }>();
    grouped.forEach((row) => {
      const current = eventStats.get(row.eventId) ?? { total: 0, insured: 0, revenue: 0 };
      current.total += row._count._all;
      if (row.insuranceSelected && activeCoverageStatuses.includes(row.status)) {
        current.insured += row._count._all;
        current.revenue += row._sum.insuranceAmountCents ?? 0;
      }
      eventStats.set(row.eventId, current);
    });

    return {
      summary: {
        totalRegistrations,
        insuredRegistrations,
        waivedRegistrations,
        insuranceRevenueCents: revenue._sum.insuranceAmountCents ?? 0
      },
      events: scopedEvents.map((event) => ({
        ...event,
        insuranceDays: calculateEventInsuranceDays(event.startDate, event.endDate),
        totalRegistrations: eventStats.get(event.id)?.total ?? 0,
        insuredRegistrations: eventStats.get(event.id)?.insured ?? 0,
        insuranceRevenueCents: eventStats.get(event.id)?.revenue ?? 0
      })),
      registrations,
      pagination: { page, pageSize, total, pages: Math.max(Math.ceil(total / pageSize), 1) }
    };
  }
}

export const insuranceService = new InsuranceService();
