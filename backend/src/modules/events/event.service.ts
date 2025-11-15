import type { Prisma } from "@/prisma/generated/client";
import slugify from "slugify";

import { env } from "../../config/env";
import { prisma } from "../../lib/prisma";
import { AppError, ConflictError, NotFoundError } from "../../utils/errors";
import { auditService } from "../../services/audit.service";
import { eventLotService } from "./event-lot.service";
import {
  DEFAULT_PAYMENT_METHODS,
  PaymentMethod,
  parsePaymentMethods,
  serializePaymentMethods
} from "../../config/payment-methods";
import {
  DEFAULT_PENDING_PAYMENT_VALUE_RULE,
  PendingPaymentValueRule
} from "../../config/pending-payment-value-rule";

type EventLotEntity = Awaited<ReturnType<typeof eventLotService.list>>[number];

const buildSlug = (title: string) =>
  slugify(title, {
    lower: true,
    strict: true,
    locale: "pt"
  });

const normalizeSlugInput = (value: string) => {
  const normalized = slugify(value, {
    lower: true,
    strict: true,
    locale: "pt"
  });
  return normalized;
};

const serializeLot = (lot: EventLotEntity | null | undefined) => {
  if (!lot) {
    return null;
  }
  return {
    id: lot.id,
    name: lot.name,
    priceCents: lot.priceCents,
    startsAt: lot.startsAt,
    endsAt: lot.endsAt
  };
};

export class EventService {
  async getPublicBySlug(slug: string) {
    const event = await prisma.event.findUnique({
      where: { slug }
    });

    if (!event || !event.isActive) {
      throw new NotFoundError("Evento nao encontrado");
    }

    const paymentMethods = parsePaymentMethods(event.paymentMethods);

    const isFree = Boolean((event as any).isFree);
    const lots = isFree ? [] : await eventLotService.list(event.id);
    const activeLot = isFree
      ? null
      : eventLotService.resolveActiveFromList(lots, new Date());

    return {
      ...event,
      isFree,
      lots,
      paymentMethods,
      publicLink: `${env.APP_URL}/evento/${event.slug}`,
      currentLot: serializeLot(activeLot),
      currentPriceCents: isFree ? 0 : activeLot?.priceCents ?? event.priceCents
    };
  }

  private async getLotsMap(eventIds: string[]): Promise<Map<string, EventLotEntity[]>> {
    const uniqueIds = Array.from(new Set(eventIds));
    const lotsMap = new Map<string, EventLotEntity[]>();

    if (uniqueIds.length === 0) {
      return lotsMap;
    }

    const lots = await prisma.eventLot.findMany({
      where: { eventId: { in: uniqueIds } },
      orderBy: [{ eventId: "asc" }, { startsAt: "asc" }]
    });

    for (const lot of lots) {
      const existing = lotsMap.get(lot.eventId) ?? [];
      existing.push(lot);
      lotsMap.set(lot.eventId, existing);
    }

    return lotsMap;
  }

  async listPublic() {
    const events = await prisma.event.findMany({
      where: { isActive: true },
      orderBy: { startDate: "asc" }
    });

    if (events.length === 0) {
      return [];
    }

    const lotsMap = await this.getLotsMap(events.map((event) => event.id));

    return events.map((event) => {
      const isFree = Boolean((event as any).isFree);
      const lots = isFree
        ? ([] as EventLotEntity[])
        : lotsMap.get(event.id) ?? ([] as EventLotEntity[]);
      const activeLot = isFree
        ? null
        : eventLotService.resolveActiveFromList(lots, new Date());
      return {
        ...event,
        isFree,
        lots,
        paymentMethods: parsePaymentMethods(event.paymentMethods),
        currentLot: serializeLot(activeLot),
        currentPriceCents: isFree ? 0 : activeLot?.priceCents ?? event.priceCents
      };
    });
  }

  async listAdmin(ministryIds?: string[]) {
    const where: Prisma.EventWhereInput = ministryIds && ministryIds.length ? { ministryId: { in: ministryIds } } : {};
    const events = await prisma.event.findMany({
      where,
      orderBy: { startDate: "desc" },
      include: { ministry: true }
    });

    if (events.length === 0) {
      return [];
    }

    const lotsMap = await this.getLotsMap(events.map((event) => event.id));

    return events.map((event) => {
      const isFree = Boolean((event as any).isFree);
      const lots = isFree
        ? ([] as EventLotEntity[])
        : lotsMap.get(event.id) ?? ([] as EventLotEntity[]);
      const activeLot = isFree
        ? null
        : eventLotService.resolveActiveFromList(lots, new Date());
      return {
        ...event,
        isFree,
        lots,
        paymentMethods: parsePaymentMethods(event.paymentMethods),
        currentLot: serializeLot(activeLot),
        currentPriceCents: isFree ? 0 : activeLot?.priceCents ?? event.priceCents,
        ministry: event.ministry
      };
    });
  }

  private async resolveUniqueSlug(baseSlug: string, ignoreId?: string) {
    let slug = baseSlug;
    let attempt = 1;
    while (
      await prisma.event.findFirst({
        where: {
          slug,
          id: ignoreId ? { not: ignoreId } : undefined
        }
      })
    ) {
      attempt += 1;
      slug = `${baseSlug}-${attempt}`;
    }
    return slug;
  }

  async create(data: {
    title: string;
    description: string;
    startDate: string;
    endDate: string;
    location: string;
    bannerUrl?: string;
    slug?: string;
    isFree: boolean;
    priceCents?: number;
    minAgeYears?: number | null;
    isActive?: boolean;
    paymentMethods?: PaymentMethod[];
    pendingPaymentValueRule?: PendingPaymentValueRule;
    ministryId: string;
  }) {
    const desiredSlug = data.slug ? normalizeSlugInput(data.slug) : null;
    const baseSlug =
      desiredSlug && desiredSlug.length > 0
        ? desiredSlug
        : buildSlug(`${data.title}-${new Date(data.startDate).getFullYear()}`);

    if (!baseSlug) {
      throw new AppError("Slug inválido", 400);
    }

    const slug = await this.resolveUniqueSlug(baseSlug);

    const ministry = await prisma.ministry.findUnique({ where: { id: data.ministryId } });
    if (!ministry || !ministry.isActive) {
      throw new AppError("Ministerio invalido", 400);
    }

    const event = await prisma.event.create({
      data: {
        ...data,
        priceCents: data.isFree ? 0 : data.priceCents ?? 0,
        paymentMethods: serializePaymentMethods(
          data.paymentMethods ?? DEFAULT_PAYMENT_METHODS
        ),
        pendingPaymentValueRule: data.pendingPaymentValueRule ?? DEFAULT_PENDING_PAYMENT_VALUE_RULE,
        slug
      }
    });
    const serialized = {
      ...event,
      paymentMethods: parsePaymentMethods(event.paymentMethods)
    };
    await auditService.log({
      action: "EVENT_CREATED",
      entity: "event",
      entityId: event.id,
      metadata: { slug }
    });
    return serialized;
  }

  async update(
    id: string,
    data: Partial<{
      title: string;
      description: string;
      startDate: string;
      endDate: string;
      location: string;
      bannerUrl?: string;
      priceCents: number;
      minAgeYears?: number | null;
      isFree?: boolean;
      isActive?: boolean;
      paymentMethods?: PaymentMethod[];
      slug?: string;
      pendingPaymentValueRule?: PendingPaymentValueRule;
      ministryId?: string;
    }>
  ) {
    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) throw new NotFoundError("Evento nao encontrado");

    const payload: Prisma.EventUpdateInput = {};

    if (data.title !== undefined) payload.title = data.title;
    if (data.description !== undefined) payload.description = data.description;
    if (data.startDate !== undefined) payload.startDate = data.startDate;
    if (data.endDate !== undefined) payload.endDate = data.endDate;
    if (data.location !== undefined) payload.location = data.location;
    if (data.bannerUrl !== undefined) payload.bannerUrl = data.bannerUrl;
    if (data.minAgeYears !== undefined) payload.minAgeYears = data.minAgeYears;
    if (data.isActive !== undefined) payload.isActive = data.isActive;
    if (data.isFree !== undefined) payload.isFree = data.isFree;

    if (data.isFree === true) {
      payload.priceCents = 0;
    } else if (data.priceCents !== undefined) {
      payload.priceCents = data.priceCents;
    }

    if (data.paymentMethods !== undefined) {
      const methods = data.paymentMethods.length ? data.paymentMethods : DEFAULT_PAYMENT_METHODS;
      payload.paymentMethods = serializePaymentMethods(methods);
    }

    if (data.pendingPaymentValueRule !== undefined) {
      payload.pendingPaymentValueRule = data.pendingPaymentValueRule;
    }

    if (data.ministryId !== undefined) {
      const ministry = await prisma.ministry.findUnique({ where: { id: data.ministryId } });
      if (!ministry || !ministry.isActive) {
        throw new AppError("Ministerio invalido", 400);
      }
      payload.ministry = { connect: { id: data.ministryId } };
    }

    if (data.slug !== undefined) {
      const normalized = normalizeSlugInput(data.slug);
      if (!normalized) {
        throw new AppError("Slug invalido", 400);
      }
      payload.slug = await this.resolveUniqueSlug(normalized, id);
    }

    const updated = await prisma.event.update({
      where: { id },
      data: payload
    });

    if (data.ministryId && data.ministryId !== event.ministryId) {
      await prisma.registration.updateMany({
        where: { eventId: id },
        data: { ministryId: data.ministryId }
      });
    }

    const serialized = {
      ...updated,
      paymentMethods: parsePaymentMethods(updated.paymentMethods)
    };
    await auditService.log({
      action: "EVENT_UPDATED",
      entity: "event",
      entityId: id,
      metadata: payload
    });
    return serialized;
  }  findActiveLot(eventId: string, referenceDate = new Date()) {
    return eventLotService.findActive(eventId, referenceDate);
  }

  async delete(id: string) {
    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) throw new NotFoundError("Evento nao encontrado");

    const [orderCount, registrationCount] = await Promise.all([
      prisma.order.count({ where: { eventId: id } }),
      prisma.registration.count({ where: { eventId: id } })
    ]);

    if (orderCount > 0 || registrationCount > 0) {
      throw new ConflictError("Evento possui pedidos ou inscricoes e nao pode ser excluido");
    }

    await prisma.event.delete({ where: { id } });
    await auditService.log({
      action: "EVENT_DELETED",
      entity: "event",
      entityId: id,
      metadata: { slug: event.slug }
    });
  }
}

export const eventService = new EventService();

