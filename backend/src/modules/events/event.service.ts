import { Prisma } from "@prisma/client";
import slugify from "slugify";

import { env } from "../../config/env";
import { prisma } from "../../lib/prisma";
import { AppError, ConflictError, NotFoundError } from "../../utils/errors";
import { auditService } from "../../services/audit.service";
import { cacheGetOrSet } from "../../utils/cache";
import { eventLotService } from "./event-lot.service";
import { buildNoticeFromFields, type EventNotice, type EventNoticeFields } from "../../config/event-notices";
import { getPublicAssetBaseUrl } from "../../utils/public-url";
import {
  invalidatePublicEventCache,
  publicEventListCacheKey,
  publicEventSlugCacheKey
} from "./event-cache";
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
import { normalizeFormConfig, resolveEventFormConfig } from "../forms/form-config";
import { calculateEventInsuranceDays } from "../../utils/event-insurance";

type EventLotEntity = Awaited<ReturnType<typeof eventLotService.list>>[number];
type ActorUser = {
  id?: string | null;
  role?: string | null;
  districtScopeId?: string | null;
  churchId?: string | null;
};

const buildSupabasePublicUrl = (objectPath: string) => {
  if (env.STORAGE_DRIVER !== "supabase") return null;
  const base = (env.SUPABASE_URL ?? "").trim().replace(/\/+$/, "");
  const bucket = (env.SUPABASE_STORAGE_BUCKET ?? "").trim();
  if (!base || !bucket) return null;

  const encodedBucket = encodeURIComponent(bucket);
  const encodedObjectPath = objectPath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `${base}/storage/v1/object/public/${encodedBucket}/${encodedObjectPath}`;
};

const toPublicBannerUrl = (value?: string | null) => {
  if (!value) return null;
  if (/^(https?:|data:|blob:)/i.test(value)) {
    return value;
  }

  const sanitized = value.replace(/^\/+/, "");
  if (!sanitized) return null;

  // Most banners are stored as just the filename (returned by `/api/admin/uploads`).
  // In Supabase mode, `storageService.saveBase64Image()` writes into `photos/<filename>`.
  if (env.STORAGE_DRIVER === "supabase") {
    const normalized = sanitized.startsWith("uploads/") ? sanitized.slice("uploads/".length) : sanitized;
    const objectPath = normalized.includes("/") ? normalized : `photos/${normalized}`;
    const directUrl = buildSupabasePublicUrl(objectPath);
    if (directUrl) return directUrl;
  }

  const base = getPublicAssetBaseUrl();
  if (sanitized.startsWith("uploads/")) {
    return `${base}/${sanitized}`;
  }
  return `${base}/uploads/${sanitized}`;
};

const cacheOptions = {
  maxEntries: env.CACHE_MAX_ENTRIES
};

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
    type: (lot as any).type ?? "PADRAO",
    status: (lot as any).status ?? "INATIVO",
    startsAt: lot.startsAt,
    endsAt: lot.endsAt
  };
};

const extractNoticeFields = (event: any): EventNoticeFields => ({
  noticeEnabled: event.noticeEnabled ?? null,
  noticeTitle: event.noticeTitle ?? null,
  noticeBullets: event.noticeBullets ?? null,
  noticeFooterText: event.noticeFooterText ?? null,
  noticeShowOnce: event.noticeShowOnce ?? null
});

const serializeNoticeForResponse = (event: any) => buildNoticeFromFields(extractNoticeFields(event));

const parseNoticeInput = (notice?: EventNotice | string | null) => {
  if (!notice) {
    return null;
  }
  if (typeof notice === "string") {
    try {
      return JSON.parse(notice) as EventNotice;
    } catch {
      return null;
    }
  }
  return notice;
};

const mapNoticeToFields = (notice?: EventNotice | string | null) => {
  const normalized = parseNoticeInput(notice);
  const enabled = Boolean(normalized?.enabled);
  const title = normalized?.title?.trim() ?? "";
  const bullets = (normalized?.bullets ?? []).map((item) => item.trim()).filter(Boolean);
  const footerText = normalized?.footerText?.trim() ?? "";
  const showOnce = normalized?.showOnce ?? true;

  return {
    noticeEnabled: enabled,
    noticeTitle: title || null,
    noticeBullets: bullets.length ? bullets.join("\n") : null,
    noticeFooterText: footerText || null,
    noticeShowOnce: showOnce
  };
};

export class EventService {
  private async resolveDistrictAdminId(districtId: string | null) {
    if (!districtId) {
      return null;
    }
    const admin = await prisma.user.findFirst({
      where: {
        districtScopeId: districtId,
        role: "AdminDistrital",
        status: "ACTIVE"
      },
      orderBy: { createdAt: "asc" }
    });
    return admin?.id ?? null;
  }

  private assertCanManageEvent(event: { createdById?: string | null }, actor?: ActorUser) {
    if (!actor) {
      throw new AppError("Permissão insuficiente", 403);
    }
    const createdById = (event as any).createdById ?? null;
    if (actor.role === "AdminGeral") {
      return;
    }
    if (actor.role === "AdminDistrital" && createdById === actor.id) {
      return;
    }
    if (actor.role === "AdminDistrital") {
      throw new AppError("Distritais só podem gerenciar eventos que cadastraram.", 403);
    }
    throw new AppError("Permissão insuficiente para gerenciar eventos.", 403);
  }

  async getPublicBySlug(slug: string) {
    return cacheGetOrSet(
      publicEventSlugCacheKey(slug),
      env.CACHE_TTL_MS,
      async () => {
        const event = await prisma.event.findUnique({
          where: { slug }
        });

        if (!event || !event.isActive) {
          throw new NotFoundError("Evento não encontrado");
        }

        const paymentMethods = parsePaymentMethods(event.paymentMethods);

        const isFree = Boolean((event as any).isFree);
        const lots = isFree ? [] : await eventLotService.list(event.id);
        const activeLot = isFree
          ? null
          : eventLotService.resolveActiveFromList(lots, new Date());

        return {
          ...event,
          bannerUrl: toPublicBannerUrl(event.bannerUrl),
          isFree,
          lots,
          paymentMethods,
          formConfig: resolveEventFormConfig(event.formConfig),
          notice: serializeNoticeForResponse(event),
          publicLink: `${env.APP_URL}/evento/${event.slug}`,
          currentLot: serializeLot(activeLot),
          currentPriceCents: isFree ? 0 : activeLot?.priceCents ?? event.priceCents,
          insuranceDays: calculateEventInsuranceDays(event.startDate, event.endDate)
        };
      },
      cacheOptions
    );
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
    return cacheGetOrSet(
      publicEventListCacheKey(),
      env.CACHE_TTL_MS,
      async () => {
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
            bannerUrl: toPublicBannerUrl(event.bannerUrl),
            isFree,
            lots,
            paymentMethods: parsePaymentMethods(event.paymentMethods),
            formConfig: resolveEventFormConfig(event.formConfig),
            notice: serializeNoticeForResponse(event),
            currentLot: serializeLot(activeLot),
            currentPriceCents: isFree ? 0 : activeLot?.priceCents ?? event.priceCents,
            insuranceDays: calculateEventInsuranceDays(event.startDate, event.endDate)
          };
        });
      },
      cacheOptions
    );
  }

  async listAdmin(ministryIds?: string[]) {
    const where: Prisma.EventWhereInput = ministryIds && ministryIds.length ? { ministryId: { in: ministryIds } } : {};
    const events = await prisma.event.findMany({
      where,
      orderBy: { startDate: "desc" }
    });

    if (events.length === 0) {
      return [];
    }

    const districtIds = Array.from(new Set(events.map((event) => event.districtId).filter(Boolean)));
    const churchIds = Array.from(new Set(events.map((event) => event.churchId).filter(Boolean)));
    const ministryIdsSet = Array.from(new Set(events.map((event) => event.ministryId).filter(Boolean)));

    const [districts, churches, ministries, lotsMap] = await Promise.all([
      districtIds.length
        ? prisma.district.findMany({ where: { id: { in: districtIds as string[] } } })
        : [],
      churchIds.length
        ? prisma.church.findMany({ where: { id: { in: churchIds as string[] } } })
        : [],
      ministryIdsSet.length
        ? prisma.ministry.findMany({ where: { id: { in: ministryIdsSet as string[] } } })
        : [],
      this.getLotsMap(events.map((event) => event.id))
    ]);

    const districtMap = new Map(districts.map((item) => [item.id, item] as const));
    const churchMap = new Map(churches.map((item) => [item.id, item] as const));
    const ministryMap = new Map(ministries.map((item) => [item.id, item] as const));

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
          bannerUrl: toPublicBannerUrl(event.bannerUrl),
          isFree,
          lots,
          paymentMethods: parsePaymentMethods(event.paymentMethods),
          currentLot: serializeLot(activeLot),
          currentPriceCents: isFree ? 0 : activeLot?.priceCents ?? event.priceCents,
          insuranceDays: calculateEventInsuranceDays(event.startDate, event.endDate),
          notice: serializeNoticeForResponse(event),
          formConfig: resolveEventFormConfig(event.formConfig),
          ministry: event.ministryId ? ministryMap.get(event.ministryId) ?? null : null,
          district: districtMap.get(event.districtId) ?? null,
          church: event.churchId ? churchMap.get(event.churchId) ?? null : null
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

  async create(
    data: {
      title: string;
      description: string;
      startDate: string;
      endDate: string;
    location: string;
    bannerUrl?: string;
    slug?: string;
    isFree: boolean;
    priceCents?: number;
    insuranceEnabled?: boolean;
    insuranceRequired?: boolean;
    insuranceDailyCents?: number;
    minAgeYears?: number | null;
    isActive?: boolean;
    paymentMethods?: PaymentMethod[];
    pendingPaymentValueRule?: PendingPaymentValueRule;
    ministryId: string;
    districtId: string;
    churchId?: string | null;
    notice?: EventNotice | string | null;
    formConfig?: unknown | null;
    },
    actor?: ActorUser
  ) {
    const insuranceRequired = Boolean(data.insuranceRequired);
    const insuranceEnabled = Boolean(data.insuranceEnabled || insuranceRequired);
    const insuranceDailyCents = insuranceEnabled
      ? Math.max(data.insuranceDailyCents ?? 0, 0)
      : 0;
    if (insuranceEnabled && insuranceDailyCents <= 0) {
      throw new AppError("Informe um valor diário válido para o seguro.", 400);
    }

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
      throw new AppError("Ministério inválido", 400);
    }

    const district = await prisma.district.findUnique({ where: { id: data.districtId } });
    if (!district) {
      throw new AppError("Distrito inválido", 400);
    }

    const isActorDistrictOwner =
      actor?.districtScopeId && data.districtId === actor.districtScopeId;

    let churchId = data.churchId ?? null;
    if (isActorDistrictOwner) {
      if (!actor?.churchId) {
        throw new AppError(
          "Usuário não possui igreja vinculada para eventos do próprio distrito.",
          400
        );
      }
      churchId = actor.churchId;
    }

    if (churchId) {
      const church = await prisma.church.findFirst({
        where: { id: churchId, districtId: data.districtId }
      });
      if (!church) {
        throw new AppError("Igreja não pertence ao distrito selecionado.", 400);
      }
    }

    const event = await prisma.event.create({
      data: {
        title: data.title,
        description: data.description,
        startDate: data.startDate,
        endDate: data.endDate,
        location: data.location,
        bannerUrl: data.bannerUrl,
        districtId: data.districtId,
        churchId,
        priceCents: data.isFree ? 0 : data.priceCents ?? 0,
        insuranceEnabled,
        insuranceRequired,
        insuranceDailyCents,
        paymentMethods: serializePaymentMethods(
          data.paymentMethods ?? DEFAULT_PAYMENT_METHODS
        ),
        pendingPaymentValueRule: data.pendingPaymentValueRule ?? DEFAULT_PENDING_PAYMENT_VALUE_RULE,
        slug,
        createdById: actor?.id ?? null,
        ministryId: data.ministryId,
        isFree: data.isFree,
        isActive: data.isActive ?? true,
        minAgeYears: data.minAgeYears ?? null,
        ...mapNoticeToFields(data.notice),
        formConfig: data.formConfig ? normalizeFormConfig(data.formConfig) : Prisma.JsonNull
      }
    });
    const serialized = {
      ...event,
      bannerUrl: toPublicBannerUrl(event.bannerUrl),
      paymentMethods: parsePaymentMethods(event.paymentMethods),
      notice: serializeNoticeForResponse(event),
      formConfig: resolveEventFormConfig(event.formConfig),
      insuranceDays: calculateEventInsuranceDays(event.startDate, event.endDate)
    };
    await auditService.log({
      action: "EVENT_CREATED",
      entity: "event",
      entityId: event.id,
      metadata: { slug }
    });
    invalidatePublicEventCache({ clearAll: true });
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
      insuranceEnabled?: boolean;
      insuranceRequired?: boolean;
      insuranceDailyCents?: number;
      minAgeYears?: number | null;
      isFree?: boolean;
      isActive?: boolean;
      paymentMethods?: PaymentMethod[];
      slug?: string;
      pendingPaymentValueRule?: PendingPaymentValueRule;
      ministryId?: string;
      districtId?: string;
      churchId?: string | null;
      notice?: EventNotice | string | null;
      formConfig?: unknown | null;
    }>,
    actor?: ActorUser
  ) {
    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) throw new NotFoundError("Evento não encontrado");
    if (actor) {
      this.assertCanManageEvent(event, actor);
    }

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
    if (data.notice !== undefined) {
      Object.assign(payload, mapNoticeToFields(data.notice));
    }
    if (data.formConfig !== undefined) {
      payload.formConfig = data.formConfig ? normalizeFormConfig(data.formConfig) : Prisma.JsonNull;
    }

    const targetDistrictId = data.districtId ?? event.districtId;
    if (!targetDistrictId) {
      throw new AppError("Distrito inválido", 400);
    }

    const insuranceRequired = data.insuranceRequired ?? event.insuranceRequired;
    const insuranceEnabled = Boolean(
      (data.insuranceEnabled ?? event.insuranceEnabled) || insuranceRequired
    );
    const insuranceDailyCents = insuranceEnabled
      ? Math.max(data.insuranceDailyCents ?? event.insuranceDailyCents, 0)
      : 0;
    if (insuranceEnabled && insuranceDailyCents <= 0) {
      throw new AppError("Informe um valor diário válido para o seguro.", 400);
    }
    payload.insuranceEnabled = insuranceEnabled;
    payload.insuranceRequired = insuranceEnabled && insuranceRequired;
    payload.insuranceDailyCents = insuranceDailyCents;
    const districtChanged = Boolean(data.districtId && data.districtId !== event.districtId);
    const targetChurchIdPayload = data.churchId ?? null;

    if (targetDistrictId) {
      const district = await prisma.district.findUnique({ where: { id: targetDistrictId } });
      if (!district) {
        throw new AppError("Distrito inválido", 400);
      }
      payload.district = { connect: { id: targetDistrictId } };
    }

    let effectiveChurchId = targetChurchIdPayload ?? event.churchId ?? null;
    const isActorDistrictOwner =
      actor?.districtScopeId && targetDistrictId && actor.districtScopeId === targetDistrictId;
    if (isActorDistrictOwner) {
      if (!actor?.churchId) {
        throw new AppError(
          "Usuário não possui igreja vinculada para eventos do próprio distrito.",
          400
        );
      }
      effectiveChurchId = actor.churchId;
    }

    if (effectiveChurchId) {
      const church = await prisma.church.findFirst({
        where: { id: effectiveChurchId, districtId: targetDistrictId }
      });
      if (!church) {
        throw new AppError("Igreja não pertence ao distrito selecionado.", 400);
      }
      payload.church = { connect: { id: effectiveChurchId } };
    } else if (data.churchId === null) {
      payload.church = { disconnect: true };
    }

    if (data.ministryId !== undefined) {
      const ministry = await prisma.ministry.findUnique({ where: { id: data.ministryId } });
      if (!ministry || !ministry.isActive) {
        throw new AppError("Ministério inválido", 400);
      }
      payload.ministry = { connect: { id: data.ministryId } };
    }

    if (data.slug !== undefined) {
      const normalized = normalizeSlugInput(data.slug);
      if (!normalized) {
        throw new AppError("Slug inválido", 400);
      }
      payload.slug = await this.resolveUniqueSlug(normalized, id);
    }

    const updated = await prisma.event.update({
      where: { id },
      data: payload
    });

    if (districtChanged) {
      const districtAdminId = await this.resolveDistrictAdminId(updated.districtId);
      await prisma.order.updateMany({
        where: { eventId: id },
        data: {
          districtId: updated.districtId,
          districtAdminId: districtAdminId ?? null
        }
      });
    }

    if (data.ministryId && data.ministryId !== event.ministryId) {
      await prisma.registration.updateMany({
        where: { eventId: id },
        data: { ministryId: data.ministryId }
      });
    }

    const serialized = {
      ...updated,
      bannerUrl: toPublicBannerUrl(updated.bannerUrl),
      paymentMethods: parsePaymentMethods(updated.paymentMethods),
      notice: serializeNoticeForResponse(updated),
      formConfig: resolveEventFormConfig(updated.formConfig),
      insuranceDays: calculateEventInsuranceDays(updated.startDate, updated.endDate)
    };
    await auditService.log({
      action: "EVENT_UPDATED",
      entity: "event",
      entityId: id,
      metadata: payload
    });
    invalidatePublicEventCache({ clearAll: true });
    return serialized;
  }

  findActiveLot(eventId: string, referenceDate = new Date()) {
    return eventLotService.findActive(eventId, referenceDate);
  }

  async delete(id: string, actor?: ActorUser) {
    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) throw new NotFoundError("Evento não encontrado");
    if (actor) {
      this.assertCanManageEvent(event, actor);
    }

    const [orderCount, registrationCount] = await Promise.all([
      prisma.order.count({ where: { eventId: id } }),
      prisma.registration.count({ where: { eventId: id } })
    ]);

    if (orderCount > 0 || registrationCount > 0) {
      throw new ConflictError("Evento possui pedidos ou inscrições e não pode ser excluído");
    }

    await prisma.event.delete({ where: { id } });
    await auditService.log({
      action: "EVENT_DELETED",
      entity: "event",
      entityId: id,
      metadata: { slug: event.slug }
    });
    invalidatePublicEventCache({ clearAll: true });
  }
}

export const eventService = new EventService();

