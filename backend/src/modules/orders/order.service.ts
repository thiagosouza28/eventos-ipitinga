import { randomUUID } from "crypto";
import { Prisma } from "@/prisma/generated/client";
import type { Request } from "express";

import { OrderStatus, RegistrationStatus, type OrderStatus as OrderStatusValue } from "../../config/statuses";
import { prisma } from "../../lib/prisma";
import { AppError, ConflictError, NotFoundError } from "../../utils/errors";
import { auditService } from "../../services/audit.service";
import { paymentService, extractPreferenceVersion, resolveCurrentLotPriceCents } from "../../services/payment.service";
import { registrationService } from "../registrations/registration.service";
import { eventService } from "../events/event.service";
import { storageService } from "../../storage/storage.service";
import { maskCpf, sanitizeCpf } from "../../utils/mask";
import { logger } from "../../utils/logger";
import { OrderTransferStatus } from "../../config/transfer-status";
import {
  DEFAULT_PAYMENT_METHODS,
  ManualPaymentMethods,
  AdminOnlyPaymentMethods,
  FreePaymentMethods,
  PaymentMethod,
  parsePaymentMethods
} from "../../config/payment-methods";
import {
  DEFAULT_PENDING_PAYMENT_VALUE_RULE,
  isPendingPaymentValueRule,
  PendingPaymentValueRule
} from "../../config/pending-payment-value-rule";
import { Gender, parseGender } from "../../config/gender";
import { calculateMercadoPagoFees } from "../../utils/mercado-pago-fees";
import { resolveEffectiveExpirationDate, resolveOrderExpirationDate } from "../../utils/order-expiration";
import { buildPixMeta } from "../../utils/pix";
import { getActivePixProvider } from "../payments/pix-gateway";
import { pixPaymentService } from "../payments/pix.service";
import { getTableColumns } from "../../utils/schema-cache";
import { resolveEventFormConfig, SYSTEM_FIELD_IDS, validateFormResponses } from "../forms/form-config";

type GenderInput = Gender | "MASCULINO" | "FEMININO" | "OUTRO";

type BatchPerson = {
  fullName: string;
  cpf: string;
  birthDate: string;
  gender: GenderInput;
  districtId: string;
  churchId: string;
  photoUrl?: string | null;
  formResponses?: Record<string, unknown> | null;
};

const isManualPayment = (paymentId: string) => paymentId.startsWith("MANUAL-");
const INTERACTIVE_TX_TIMEOUT_MS = 15000;

type ActorUser = Request["user"];

const parseDateParts = (value?: string | null) => {
  if (!value) return null;
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }
  return { year, month, day };
};

const calculateAgeAtDate = (birthDate: string, referenceDate?: Date | null) => {
  const birthParts = parseDateParts(birthDate);
  if (!birthParts || !referenceDate || Number.isNaN(referenceDate.getTime())) {
    return null;
  }
  const refYear = referenceDate.getUTCFullYear();
  const refMonth = referenceDate.getUTCMonth() + 1;
  const refDay = referenceDate.getUTCDate();
  let age = refYear - birthParts.year;
  if (refMonth < birthParts.month || (refMonth === birthParts.month && refDay < birthParts.day)) {
    age -= 1;
  }
  return age >= 0 ? age : null;
};

const resolvePriceCentsForAge = (
  ageYears: number | null | undefined,
  minAgeYears: number | null,
  unitPriceCents: number
) => {
  if (minAgeYears === null) return unitPriceCents;
  if (typeof ageYears === "number" && ageYears <= minAgeYears) return 0;
  return unitPriceCents;
};

const resolveOrderDistrictId = (
  registrations: Array<{ districtId?: string | null }>,
  eventDistrictId?: string | null
) => {
  if (eventDistrictId) {
    return eventDistrictId;
  }
  const ids = Array.from(
    new Set(
      registrations
        .map((registration) => registration.districtId)
        .filter((id): id is string => Boolean(id))
    )
  );
  if (!ids.length) {
    return null;
  }
  if (ids.length > 1) {
    logger.warn({ districts: ids }, "Inscricoes de pedidos com distritos diferentes. Usando o primeiro.");
  }
  return ids[0];
};

const isPendingTransferStatus = (status?: string | null) =>
  !status || status === OrderTransferStatus.PENDING || status === OrderTransferStatus.FAILED;

const resolveOrderColumns = async () => {
  const columns = await getTableColumns("Order");
  const columnSet = new Set(columns);
  return {
    hasFeeCents: columnSet.has("feeCents"),
    hasNetAmountCents: columnSet.has("netAmountCents"),
    hasAmountToTransfer: columnSet.has("amountToTransfer"),
    hasDistrictId: columnSet.has("districtId"),
    hasDistrictAdminId: columnSet.has("districtAdminId"),
    hasTransferStatus: columnSet.has("transferStatus"),
    hasTransferBatchId: columnSet.has("transferBatchId"),
    hasResponsibleUserId: columnSet.has("responsibleUserId")
  };
};

export class OrderService {
  async findAllPendingOrders(cpf: string) {
    const orders = await prisma.order.findMany({
      where: {
        buyerCpf: sanitizeCpf(cpf),
        status: "PENDING"
      },
      include: {
        registrations: true,
        event: {
          select: {
            id: true,
            title: true,
            priceCents: true,
            pendingPaymentValueRule: true,
            minAgeYears: true
          }
        }
      }
    });

    const now = new Date();
    const validOrders = orders.filter((order) => {
      const expiration = resolveEffectiveExpirationDate(
        order.paymentMethod as PaymentMethod,
        order.createdAt,
        order.expiresAt
      );
      return expiration > now;
    });

    return Promise.all(
      validOrders.map(async (order) => {
        const ruleValue = order.event?.pendingPaymentValueRule;
        const pricingRule = isPendingPaymentValueRule(ruleValue)
          ? ruleValue
          : DEFAULT_PENDING_PAYMENT_VALUE_RULE;

        if (pricingRule !== "UPDATE_TO_ACTIVE_LOT") {
          return {
            ...order,
            pendingPricingRule: pricingRule
          };
        }

        const unitPriceCents = await resolveCurrentLotPriceCents(
          order.eventId,
          order.event?.priceCents ?? order.totalCents / Math.max(order.registrations.length, 1)
        );

        const minAgeLimit = typeof order.event?.minAgeYears === "number" ? order.event.minAgeYears : null;
        const registrationsWithPricing = order.registrations.map((registration) => ({
          ...registration,
          priceCents: resolvePriceCentsForAge(registration.ageYears ?? null, minAgeLimit, unitPriceCents)
        }));
        const totalCents = registrationsWithPricing.reduce((acc, reg) => acc + (reg.priceCents ?? 0), 0);
        return {
          ...order,
          totalCents,
          registrations: registrationsWithPricing,
          pendingPricingRule: pricingRule
        };
      })
    );
  }

  async findPendingOrder(eventId: string, buyerCpf: string) {
    const orders = await prisma.order.findMany({
      where: {
        eventId,
        buyerCpf: sanitizeCpf(buyerCpf),
        status: "PENDING"
      },
      include: {
        registrations: true,
        event: {
          select: {
            id: true,
            title: true,
            priceCents: true,
            pendingPaymentValueRule: true,
            minAgeYears: true
          }
        }
      }
    });

    const now = new Date();
    const validOrders = orders.filter((order) => {
      const expiration = resolveEffectiveExpirationDate(
        order.paymentMethod as PaymentMethod,
        order.createdAt,
        order.expiresAt
      );
      return expiration > now;
    });

    return Promise.all(
      validOrders.map(async (order) => {
        const ruleValue = order.event?.pendingPaymentValueRule;
        const pricingRule = isPendingPaymentValueRule(ruleValue)
          ? ruleValue
          : DEFAULT_PENDING_PAYMENT_VALUE_RULE;

        if (pricingRule !== "UPDATE_TO_ACTIVE_LOT") {
          return {
            ...order,
            pendingPricingRule: pricingRule
          };
        }

        const unitPriceCents = await resolveCurrentLotPriceCents(
          order.eventId,
          order.event?.priceCents ?? order.totalCents / Math.max(order.registrations.length, 1)
        );

        const minAgeLimit = typeof order.event?.minAgeYears === "number" ? order.event.minAgeYears : null;
        const registrationsWithPricing = order.registrations.map((registration) => ({
          ...registration,
          priceCents: resolvePriceCentsForAge(registration.ageYears ?? null, minAgeLimit, unitPriceCents)
        }));
        const totalCents = registrationsWithPricing.reduce((acc, reg) => acc + (reg.priceCents ?? 0), 0);
        return {
          ...order,
          totalCents,
          registrations: registrationsWithPricing,
          pendingPricingRule: pricingRule
        };
      })
    );
  }

  private async resolveDistrictAdminId(
    districtId: string | null,
    tx: Prisma.TransactionClient | typeof prisma = prisma
  ) {
    if (!districtId) return null;
    const admin = await tx.user.findFirst({
      where: {
        districtScopeId: districtId,
        role: "AdminDistrital",
        status: "ACTIVE"
      },
      orderBy: { createdAt: "asc" }
    });
    return admin?.id ?? null;
  }

  async createBatch(payload: {
    eventId: string;
    buyerCpf: string;
    people: BatchPerson[];
    paymentMethod?: PaymentMethod;
  }, actor?: ActorUser | undefined) {
    const handlerStart = Date.now();
    const participantCount = payload.people.length;
    try {
    const actorId = actor?.id;
    const actorRole = actor?.role;
    const actorDistrictId = actor?.districtScopeId ?? null;
    const actorChurchId = actor?.churchId ?? null;
    const isDirectorLocal = actorRole === "DiretorLocal";
    if (isDirectorLocal && (!actorDistrictId || !actorChurchId)) {
      throw new AppError("Diretor local sem igreja ou distrito definido.", 400);
    }
    if (!payload.people.length) {
      throw new AppError("Informe ao menos uma inscricao", 400);
    }

    const event = await prisma.event.findUnique({ where: { id: payload.eventId } });
    if (!event || !event.isActive) {
      throw new NotFoundError("Evento nao disponivel");
    }
    if (!event.ministryId) {
      throw new AppError("Evento sem ministerio associado", 400);
    }
    if (!event.districtId) {
      throw new AppError("Evento sem distrito associado", 400);
    }

    const formConfig = resolveEventFormConfig(event.formConfig);
    const formErrors: Record<number, Record<string, string>> = {};
    const cleanedFormResponses = payload.people.map((person, index) => {
      const validation = validateFormResponses(formConfig, person.formResponses ?? {}, {
        ignoreFields: SYSTEM_FIELD_IDS
      });
      if (Object.keys(validation.errors).length) {
        formErrors[index] = validation.errors;
      }
      return validation.cleaned;
    });
    if (Object.keys(formErrors).length) {
      throw new AppError("Campos do formulário inválidos", 422, {
        fieldErrors: formErrors
      });
    }

    const allowedMethods = parsePaymentMethods(event.paymentMethods);
    const requestedMethod = payload.paymentMethod;
    const fallbackMethod =
      allowedMethods[0] ?? DEFAULT_PAYMENT_METHODS[0] ?? PaymentMethod.PIX_MP;
    let resolvedMethod =
      requestedMethod && (allowedMethods.includes(requestedMethod) || ((actorRole === "AdminGeral" || actorRole === "AdminDistrital") && AdminOnlyPaymentMethods.includes(requestedMethod as any))) ? requestedMethod : fallbackMethod;

    // Verificar se método é exclusivo de admin
    if (AdminOnlyPaymentMethods.includes(resolvedMethod as PaymentMethod)) {
      if (!actorId || !actorRole) {
        throw new AppError("Este metodo de pagamento e exclusivo para administradores", 403);
      }
      // Verificar se o usuário é admin (AdminGeral ou AdminDistrital)
      const isAdmin = actorRole === "AdminGeral" || actorRole === "AdminDistrital";
      if (!isAdmin) {
        throw new AppError("Este metodo de pagamento e exclusivo para administradores", 403);
      }
    }

    const isFreeEvent = Boolean((event as any).isFree);
    const isFreePaymentMethod = FreePaymentMethods.includes(resolvedMethod as PaymentMethod);
    const sanitizedBuyerCpf = sanitizeCpf(payload.buyerCpf);
    
    // Se for método gratuito, não usar PIX_MP mesmo para eventos gratuitos
    if (isFreePaymentMethod) {
      // Método gratuito já está definido
    } else if (isFreeEvent) {
      resolvedMethod = PaymentMethod.PIX_MP;
    }

    const isManualMethod = ManualPaymentMethods.includes(resolvedMethod);

    const now = new Date();
    const activeLot = (isFreeEvent || isFreePaymentMethod) ? null : await eventService.findActiveLot(payload.eventId, now);
    if (!isFreeEvent && !isFreePaymentMethod && !activeLot) {
      throw new AppError("Nenhum lote disponivel para inscricao no momento", 400);
    }

    // Se for método de pagamento gratuito, o valor é sempre 0
    const unitPriceCents = (isFreeEvent || isFreePaymentMethod)
      ? 0
      : Math.max(activeLot?.priceCents ?? 0, 0);

    const uniqueCpfs = new Set(payload.people.map((p) => sanitizeCpf(p.cpf)));
    if (uniqueCpfs.size !== payload.people.length) {
      throw new AppError("Ha CPFs duplicados no lote", 400);
    }

    const peoplePrepared = await Promise.all(
      payload.people.map(async (person, index) => {
        const lockedDistrictId = isDirectorLocal && actorDistrictId ? actorDistrictId : person.districtId;
        const lockedChurchId = isDirectorLocal && actorChurchId ? actorChurchId : person.churchId;
        const cpf = sanitizeCpf(person.cpf);
        const storedPhoto = person.photoUrl
          ? await storageService.saveBase64Image(person.photoUrl)
          : null;
        return {
          ...person,
          fullName: person.fullName.trim().toUpperCase(),
          cpf,
          districtId: lockedDistrictId,
          churchId: lockedChurchId,
          storedPhoto,
          gender: parseGender(person.gender),
          formResponses: cleanedFormResponses[index] ?? {}
        };
      })
    );

    const minAgeLimit = typeof event.minAgeYears === "number" ? event.minAgeYears : null;
    const peopleWithPricing = peoplePrepared.map((person) => {
      const ageYears = calculateAgeAtDate(person.birthDate, event.startDate);
      if (ageYears === null) {
        throw new AppError("Data de nascimento invalida.", 400);
      }
      const basePriceCents = resolvePriceCentsForAge(ageYears, minAgeLimit, unitPriceCents);
      const priceCents = (isFreeEvent || isFreePaymentMethod) ? 0 : basePriceCents;
      return { ...person, ageYears, priceCents };
    });

    const totalCents = peopleWithPricing.reduce((acc, person) => acc + person.priceCents, 0);
    const isFreeOrder = isFreeEvent || isFreePaymentMethod || totalCents === 0;
    const paidAtValue = isFreeOrder ? new Date() : null;

    const orderDistrictId = event.districtId;
    const districtAdminId = await this.resolveDistrictAdminId(orderDistrictId);
    const orderId = randomUUID();
    const expiresAt = resolveOrderExpirationDate(resolvedMethod);

    const registrationData: Prisma.RegistrationUncheckedCreateInput[] = peopleWithPricing.map(
      (person) => {
        const birthDateParts = person.birthDate.split("-");
        const birthDateUTC = new Date(Date.UTC(
          parseInt(birthDateParts[0], 10),
          parseInt(birthDateParts[1], 10) - 1,
          parseInt(birthDateParts[2], 10)
        ));

        return {
          orderId,
          eventId: payload.eventId,
          fullName: person.fullName,
          cpf: person.cpf,
          birthDate: birthDateUTC,
          ageYears: person.ageYears,
          districtId: person.districtId,
          churchId: person.churchId,
          photoUrl: person.storedPhoto,
          gender: person.gender,
          formResponses: (person.formResponses ?? {}) as Prisma.InputJsonValue,
          paymentMethod: resolvedMethod,
          ministryId: event.ministryId,
          status: isFreeOrder ? RegistrationStatus.PAID : RegistrationStatus.PENDING_PAYMENT,
          responsibleUserId: event.createdById ?? null,
          priceCents: person.priceCents,
          paidAt: paidAtValue
        };
      }
    );

    const txStart = Date.now();
    const order = await prisma.$transaction(async (tx) => {
      // Limpar inscricoes e pedidos anteriores (pendentes/cancelados/expirados) para os CPFs informados
      const existingRegistrations = peoplePrepared.length
        ? await tx.registration.findMany({
            where: {
              eventId: payload.eventId,
              cpf: { in: peoplePrepared.map((person) => person.cpf) }
            },
            include: {
              order: {
                include: { registrations: true }
              }
            }
          })
        : [];

      if (existingRegistrations.length) {
        for (const existing of existingRegistrations) {
          const order = existing.order;
          if (order && (order.status as OrderStatus) === OrderStatus.PAID) {
            throw new ConflictError(
              `CPF ${maskCpf(existing.cpf)} ja possui inscricao paga para este evento.`
            );
          }
        }

        const existingIds = new Set(existingRegistrations.map((reg) => reg.id));
        await tx.registration.deleteMany({
          where: { id: { in: Array.from(existingIds) } }
        });

        const cancelableStatuses: OrderStatus[] = [
          OrderStatus.PENDING,
          OrderStatus.CANCELED,
          OrderStatus.EXPIRED
        ];
        const ordersToAdjust = new Map<string, (typeof existingRegistrations)[number]["order"]>();
        for (const reg of existingRegistrations) {
          if (!reg.order) continue;
          if (!cancelableStatuses.includes(reg.order.status as OrderStatus)) continue;
          ordersToAdjust.set(reg.order.id, reg.order);
        }

        for (const order of ordersToAdjust.values()) {
          const remaining = order.registrations.filter((r) => !existingIds.has(r.id));
          if (remaining.length === 0) {
            await tx.order.delete({ where: { id: order.id } });
          } else {
            const newTotal = remaining.reduce((acc, r) => acc + (r.priceCents ?? 0), 0);
            await tx.order.update({
              where: { id: order.id },
              data: {
                totalCents: newTotal,
                status: newTotal > 0 ? OrderStatus.PENDING : OrderStatus.CANCELED,
                mpPreferenceId: null,
                mpPaymentId: null,
                preferenceVersion: { increment: 1 }
              }
            });
          }
        }
      }

      // Se for gratuito/isento, marcar como pago automaticamente
      const orderStatus = isFreeOrder ? OrderStatus.PAID : OrderStatus.PENDING;
      const order = await tx.order.create({
        data: {
          id: orderId,
          eventId: payload.eventId,
          buyerCpf: sanitizedBuyerCpf,
          totalCents,
          status: orderStatus,
          paymentMethod: resolvedMethod,
          externalReference: orderId,
          expiresAt,
          pricingLotId: activeLot?.id ?? null,
          mpPaymentId: isFreeOrder ? `MANUAL-FREE-${Date.now()}` : null,
          paidAt: paidAtValue,
          districtId: orderDistrictId,
          districtAdminId,
          responsibleUserId: event.createdById ?? null,
          amountToTransfer: orderStatus === OrderStatus.PAID ? totalCents : 0,
          transferStatus: orderStatus === OrderStatus.PAID ? OrderTransferStatus.PENDING : null
        }
      });
      await tx.registration.createMany({ data: registrationData });

      return order;
    }, { timeout: INTERACTIVE_TX_TIMEOUT_MS });
    const txMs = Date.now() - txStart;

    const registrationRows = await prisma.registration.findMany({
      where: { orderId: order.id },
      select: { id: true }
    });
    const registrationIds = registrationRows.map((row) => row.id);

    logger.info(
      {
        orderId: order.id,
        participantCount,
        totalCents,
        paymentMethod: resolvedMethod,
        handlerMs: Date.now() - handlerStart,
        txMs
      },
      "ORDER_CREATE_BATCH_TIMING"
    );

    await auditService.log({
      action: "ORDER_CREATED",
      entity: "order",
      entityId: order.id,
      metadata: {
        count: registrationIds.length,
        eventId: payload.eventId,
        buyerCpf: sanitizedBuyerCpf,
        paymentMethod: resolvedMethod
      }
    });

    if (isFreeOrder) {
      try {
        await registrationService.generateReceiptsForOrder(order.id);
      } catch (error) {
        logger.warn({ orderId: order.id, error }, "Falha ao gerar comprovantes de inscricao gratuita");
      }
      return {
        orderId: order.id,
        registrationIds,
        payment: {
          status: OrderStatus.PAID,
          paymentMethod: resolvedMethod,
          participantCount: registrationIds.length,
          totalCents,
          isFree: true
        }
      };
    }

    if (isManualMethod) {
      return {
        orderId: order.id,
        registrationIds,
        payment: {
          status: OrderStatus.PENDING,
          paymentMethod: resolvedMethod,
          participantCount: registrationIds.length,
          totalCents,
          isManual: true
        }
      };
    }

    let payment;
    try {
      payment = await paymentService.createPreference(order.id);
    } catch (error) {
      logger.error(
        { orderId: order.id, error },
        "Falha ao gerar preferencia de pagamento"
      );
      await prisma.registration.deleteMany({ where: { orderId: order.id } });
      await prisma.order.delete({ where: { id: order.id } });
      throw new AppError("Nao foi possivel gerar o pagamento. Tente novamente.", 502);
    }

    return {
      orderId: order.id,
      registrationIds,
      payment: {
        ...payment,
        paymentMethod: resolvedMethod,
        participantCount: registrationIds.length,
        totalCents
      }
    };
    } catch (error: any) {
      logger.error(
        {
          handlerMs: Date.now() - handlerStart,
          participantCount,
          prismaCode: error?.code,
          modelName: error?.meta?.modelName,
          message: error?.message
        },
        "ORDER_CREATE_BATCH_FAILED"
      );
      throw error;
    }
  }

  async getPayment(orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { registrations: true, event: true }
    });
    if (!order) throw new NotFoundError("Pedido nao encontrado");
    if (order.status === OrderStatus.CANCELED) {
      throw new AppError("Pedido cancelado", 400);
    }
    const paymentMethod = (order.paymentMethod as PaymentMethod) ?? PaymentMethod.PIX_MP;
    const effectiveExpiration = resolveEffectiveExpirationDate(
      paymentMethod,
      order.createdAt,
      order.expiresAt
    );
    const now = new Date();
    const hasExpired =
      order.status === OrderStatus.EXPIRED ||
      (order.status === OrderStatus.PENDING && effectiveExpiration <= now);
    if (
      !hasExpired &&
      order.status === OrderStatus.PENDING &&
      (!order.expiresAt || order.expiresAt.getTime() !== effectiveExpiration.getTime())
    ) {
      await prisma.order
        .update({
          where: { id: orderId },
          data: { expiresAt: effectiveExpiration }
        })
        .catch(() => undefined);
      order.expiresAt = effectiveExpiration;
    }
    const participantCount = order.registrations.length;
    let receipts: Array<{ registrationId: string; fullName: string; receiptUrl: string }> = [];
    if (order.status === OrderStatus.PAID) {
      receipts = await registrationService.listReceiptLinksByOrder(orderId);
    }
    const fallbackPriceCents = order.event?.priceCents ?? 0;
    const minAgeLimit = typeof order.event?.minAgeYears === "number" ? order.event.minAgeYears : null;
    const paymentRule = isPendingPaymentValueRule(order.event?.pendingPaymentValueRule)
      ? (order.event?.pendingPaymentValueRule as PendingPaymentValueRule)
      : DEFAULT_PENDING_PAYMENT_VALUE_RULE;
    let totalCents = order.totalCents;
    let needsPriceUpdate = false;
    let recalculatedUnitPrice: number | null = null;
    let recalculatedPrices: number[] | null = null;
    if (paymentRule === "UPDATE_TO_ACTIVE_LOT" && participantCount > 0) {
      const unitPriceCents = await resolveCurrentLotPriceCents(order.eventId, fallbackPriceCents);
      recalculatedUnitPrice = unitPriceCents;
      recalculatedPrices = order.registrations.map((registration) =>
        resolvePriceCentsForAge(registration.ageYears ?? null, minAgeLimit, unitPriceCents)
      );
      totalCents = recalculatedPrices.reduce((acc, price) => acc + price, 0);
      needsPriceUpdate =
        totalCents !== order.totalCents ||
        recalculatedPrices.some((price, index) => price !== (order.registrations[index].priceCents ?? 0));
    }

    if (needsPriceUpdate && recalculatedUnitPrice !== null) {
      const updates: Prisma.PrismaPromise<any>[] = [
        prisma.order.update({
          where: { id: order.id },
          data: { totalCents }
        })
      ];
      if (minAgeLimit !== null) {
        updates.push(
          prisma.registration.updateMany({
            where: { orderId: order.id, ageYears: { lte: minAgeLimit } },
            data: { priceCents: 0 }
          }),
          prisma.registration.updateMany({
            where: { orderId: order.id, ageYears: { gt: minAgeLimit } },
            data: { priceCents: recalculatedUnitPrice }
          })
        );
      } else {
        updates.push(
          prisma.registration.updateMany({
            where: { orderId: order.id },
            data: { priceCents: recalculatedUnitPrice }
          })
        );
      }
      await prisma.$transaction(updates);
      order.totalCents = totalCents;
      if (recalculatedPrices) {
        order.registrations = order.registrations.map((registration, index) => ({
          ...registration,
          priceCents: recalculatedPrices?.[index] ?? registration.priceCents
        }));
      }
    }

    const isManualMethod = ManualPaymentMethods.includes(paymentMethod);

    const participants = order.registrations.map((registration) => ({
      id: registration.id,
      fullName: registration.fullName,
      status: registration.status
    }));
    const manualPaymentProofUrl = order.manualPaymentProofUrl ?? undefined;

    const isFreeEvent = Boolean((order.event as any)?.isFree);
    const isFreeOrder = isFreeEvent || totalCents === 0;
    if (isFreeOrder) {
      return {
        status: order.status,
        paymentId: order.mpPaymentId,
        paymentMethod,
        participantCount,
        participants,
        totalCents,
        paidAt: order.paidAt,
        isFree: true,
        receipts,
        manualPaymentProofUrl
      };
    }

    if (isManualMethod) {
      return {
        status: order.status,
        paymentId: order.manualPaymentReference ?? order.mpPaymentId,
        paymentMethod,
        participantCount,
        participants,
        totalCents,
        isManual: true,
        paidAt: order.paidAt,
        receipts,
        manualPaymentProofUrl
      };
    }

    const activePixProvider = await getActivePixProvider().catch(() => null);
    const useUniversalPix =
      paymentMethod === PaymentMethod.PIX_MP &&
      activePixProvider &&
      activePixProvider !== "mercadopago";

    if (useUniversalPix) {
      const pixPayment = await pixPaymentService.createCharge(orderId);
      const pixMeta = buildPixMeta(pixPayment.pixQrData ?? undefined);
      return {
        status: order.status,
        paymentId: pixPayment.chargeId ?? order.mpPaymentId,
        paymentMethod,
        participantCount,
        participants,
        totalCents,
        pixQrData: pixPayment.pixQrData ?? undefined,
        ...pixMeta,
        paidAt: order.paidAt,
        receipts: order.status === OrderStatus.PAID ? receipts : [],
        provider: pixPayment.provider,
        expiresAt: pixPayment.expiresAt ?? order.expiresAt,
        manualPaymentProofUrl
      };
    }

    if (order.status === "PAID") {
      return {
        status: order.status,
        paymentId: order.mpPaymentId,
        paymentMethod,
        participantCount,
        participants,
        totalCents,
        paidAt: order.paidAt,
        receipts,
        manualPaymentProofUrl
      };
    }

    const latestPayment = await paymentService.findLatestPaymentByExternalReference(orderId);
    const invalidPaymentStatus =
      latestPayment?.status &&
      ["cancelled", "canceled", "rejected", "refunded", "charged_back", "expired"].includes(
        latestPayment.status.toLowerCase()
      );
    let forcedNewPayment = false;
    if (hasExpired || invalidPaymentStatus) {
      forcedNewPayment = true;
      const nextExpiration = resolveOrderExpirationDate(paymentMethod, new Date());
      await prisma.order
        .update({
          where: { id: orderId },
          data: {
            status: OrderStatus.PENDING,
            expiresAt: nextExpiration,
            mpPreferenceId: null,
            mpPaymentId: null
          }
        })
        .catch(() => undefined);
      order.status = OrderStatus.PENDING;
      order.expiresAt = nextExpiration;
      order.mpPreferenceId = null;
      order.mpPaymentId = null;
    }
    const latestStatus = latestPayment?.status;
    if (latestPayment?.id && (latestStatus === "approved" || latestStatus === "authorized")) {
      let metadataVersion: number | null = null;
      try {
        const paymentDetails = await paymentService.fetchPayment(String(latestPayment.id));
        metadataVersion = extractPreferenceVersion((paymentDetails as any)?.metadata);
      } catch (error) {
        logger.warn(
          { orderId, paymentId: latestPayment.id, error },
          "Falha ao validar pagamento aprovado. Prosseguindo com verificacao padrao."
        );
      }
      const updated = await this.markPaid(
        orderId,
        String(latestPayment.id),
        {
          preferenceVersion: metadataVersion ?? undefined,
          paymentMethod
        }
      );
      if (updated.status === OrderStatus.PAID) {
        const updatedReceipts = await registrationService.listReceiptLinksByOrder(orderId);
        return {
          status: updated.status,
          paymentId: updated.mpPaymentId,
          paymentMethod,
          participantCount,
          participants,
          totalCents,
          paidAt: updated.paidAt,
          receipts: updatedReceipts
        };
      }
    }

    const shouldRefreshPreference = needsPriceUpdate || forcedNewPayment;

    let preference;
    if (!shouldRefreshPreference && order.mpPreferenceId && order.expiresAt && order.expiresAt > new Date()) {
      try {
        preference = await paymentService.getPreference(order.mpPreferenceId);
      } catch (error) {
        logger.warn({ orderId, error }, "Falha ao reaproveitar preferencia existente. Gerando nova.");
      }
    }

    const payment =
      preference ?? (await paymentService.createPreference(orderId));

    // Tentar obter/garantir dados de PIX (qr_code e base64)
    let pixQrData = forcedNewPayment ? undefined : (payment as any)?.pixQrData;

    // Se j? houver um pagamento no MP (mesmo pendente), tentar extrair o QR dele
    if (latestPayment?.id && !pixQrData && !forcedNewPayment) {
      try {
        const details = await paymentService.fetchPayment(String(latestPayment.id));
        const paymentVersion = extractPreferenceVersion((details as any)?.metadata);
        if (!paymentVersion || paymentVersion === order.preferenceVersion) {
          pixQrData = (details as any)?.point_of_interaction?.transaction_data ?? pixQrData;
        }
      } catch (error) {
        logger.warn({ orderId, paymentId: latestPayment.id, error }, "Falha ao recuperar QR do pagamento existente");
      }
    }

    // Como fallback final, gerar um pagamento PIX específico para obter o QR
    if (!pixQrData && paymentMethod === PaymentMethod.PIX_MP) {
      try {
      const pix = await paymentService.createPixPaymentForOrder(orderId);
        pixQrData = pix.pixQrData ?? pixQrData;
      } catch (error) {
        logger.warn({ orderId, error }, "Falha ao criar pagamento PIX para gerar QR");
      }
    }

    if (latestPayment?.statusDetail && invalidPaymentStatus) {
      logger.warn(
        {
          orderId,
          paymentId: latestPayment.id,
          status: latestPayment.status,
          statusDetail: latestPayment.statusDetail
        },
        "PIX_PAYMENT_REJECTED"
      );
    }

    const pixMeta = buildPixMeta(pixQrData);

    return {
      ...payment,
      pixQrData,
      ...pixMeta,
      status: latestStatus ?? order.status,
      statusDetail: latestPayment?.statusDetail,
      paymentMethod,
      participantCount,
      participants,
      totalCents,
      receipts: [],
      pixReactivated: forcedNewPayment,
      manualPaymentProofUrl
    };
  }

  async list(filters: { eventId?: string; status?: OrderStatusValue; churchId?: string; districtId?: string; ministryIds?: string[] }) {
    const { hasFeeCents, hasNetAmountCents } = await resolveOrderColumns();

    // Usar select para evitar problemas com colunas que podem não existir
    const registrationFilter: Record<string, string> = {};
    if (filters.churchId) registrationFilter.churchId = filters.churchId;
    if (filters.districtId) registrationFilter.districtId = filters.districtId;

    return prisma.order.findMany({
      where: {
        eventId: filters.eventId,
        status: filters.status,
        ...(Object.keys(registrationFilter).length
          ? {
              registrations: {
                some: registrationFilter
              }
            }
          : {}),
        ...(filters.ministryIds && filters.ministryIds.length
          ? {
              event: {
                ministryId: {
                  in: filters.ministryIds
                }
              }
            }
          : {})
      },
      select: {
        id: true,
        eventId: true,
        buyerCpf: true,
        totalCents: true,
        status: true,
        paymentMethod: true,
        mpPreferenceId: true,
        mpPaymentId: true,
        manualPaymentReference: true,
        manualPaymentProofUrl: true,
        expiresAt: true,
        createdAt: true,
        ...(hasFeeCents && { feeCents: true }),
        ...(hasNetAmountCents && { netAmountCents: true }),
        registrations: {
          select: {
            id: true,
            fullName: true,
            cpf: true,
            birthDate: true,
            districtId: true,
            churchId: true,
            priceCents: true,
            status: true,
            createdAt: true
          }
        },
        refunds: {
          select: {
            id: true,
            orderId: true,
            amountCents: true,
            reason: true,
            createdAt: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });
  }

  // Gera um pagamento exclusivo para uma inscrição específica.
  // Se a inscrição pertencer a um pedido com outras inscrições, move-a para um novo pedido (split)
  // e invalida a preferência antiga do pedido original. Se já estiver sozinha, apenas gera nova preferência.
  async createIndividualPaymentForRegistration(registrationId: string) {
    const registration = await prisma.registration.findUnique({
      where: { id: registrationId },
      include: {
        order: {
          include: {
            registrations: true,
            event: true
          }
        },
        event: true
      }
    });
    if (!registration) {
      throw new NotFoundError("Inscricao nao encontrada");
    }
    if (registration.status === RegistrationStatus.PAID) {
      throw new AppError("Inscricao ja paga", 400);
    }
    if (registration.status === RegistrationStatus.CANCELED) {
      throw new AppError("Inscricao cancelada", 400);
    }
    if (!registration.event?.districtId) {
      throw new AppError("Evento sem distrito associado", 400);
    }

    const order = registration.order;
    if (!order) {
      throw new NotFoundError("Pedido associado nao encontrado");
    }
    if (order.mpPaymentId) {
      throw new AppError("Pedido ja possui pagamento registrado. Aguarde confirmacao ou estorne.", 400);
    }

    const paymentMethod = (order.paymentMethod as PaymentMethod) ?? PaymentMethod.PIX_MP;
    const effectiveExpiration = resolveEffectiveExpirationDate(
      paymentMethod,
      order.createdAt,
      order.expiresAt
    );
    const hasValidPreference =
      Boolean(order.mpPreferenceId) &&
      order.status === OrderStatus.PENDING &&
      registration.status === RegistrationStatus.PENDING_PAYMENT &&
      effectiveExpiration > new Date();

    const isSingleRegistrationOrder = (order.registrations?.length ?? 1) === 1;
    if (isSingleRegistrationOrder && hasValidPreference) {
      try {
        const payment = await paymentService.getPreference(order.mpPreferenceId as string);
        return { orderId: order.id, payment };
      } catch (error) {
        logger.warn(
          { registrationId, orderId: order.id, error },
          "Preferencia existente invalida, gerando nova"
        );
      }
    }

    if (isSingleRegistrationOrder) {
      const newExpiresAt = resolveOrderExpirationDate(paymentMethod, new Date());
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.PENDING,
          mpPaymentId: null,
          mpPreferenceId: null,
          manualPaymentReference: null,
          manualPaymentProofUrl: null,
          expiresAt: newExpiresAt
        }
      });
      const payment = await paymentService.createPreference(order.id);
      return { orderId: order.id, payment };
    }

    const oldOrderId = registration.orderId;
    const priceCents =
      typeof registration.priceCents === "number"
        ? registration.priceCents
        : registration.event.priceCents ?? 0;
    const expiresAt = resolveOrderExpirationDate(paymentMethod);
    const buyerCpf = sanitizeCpf(order.buyerCpf ?? registration.cpf);
    const newOrderId = randomUUID();
    const districtAdminId = await this.resolveDistrictAdminId(registration.event.districtId);
    const shouldDeleteOldOrder =
      (order.status === OrderStatus.PENDING ||
        order.status === OrderStatus.CANCELED ||
        order.status === OrderStatus.EXPIRED) &&
      !order.mpPaymentId &&
      (order.registrations?.length ?? 0) <= 1;

    await prisma.$transaction(async (tx) => {
      await tx.order.create({
        data: {
          id: newOrderId,
          eventId: registration.eventId,
          buyerCpf,
          totalCents: priceCents,
          status: OrderStatus.PENDING,
          paymentMethod,
          externalReference: newOrderId,
          expiresAt,
          mpPreferenceId: null,
          mpPaymentId: null,
          preferenceVersion: 0,
          districtId: registration.event.districtId,
          districtAdminId,
          responsibleUserId: registration.event.createdById ?? null
        }
      });

      await tx.registration.update({
        where: { id: registrationId },
        data: {
          orderId: newOrderId,
          paymentMethod,
          responsibleUserId: registration.event.createdById ?? registration.responsibleUserId ?? null
        }
      });

      if (shouldDeleteOldOrder) {
        await tx.order.delete({ where: { id: oldOrderId } });
      } else {
        const remaining = await tx.registration.findMany({ where: { orderId: oldOrderId } });
        const newTotal = remaining.reduce((acc, r) => acc + (r.priceCents ?? 0), 0);

        await tx.order.update({
          where: { id: oldOrderId },
          data: {
            totalCents: newTotal,
            status: newTotal > 0 ? OrderStatus.PENDING : OrderStatus.CANCELED,
            mpPreferenceId: null,
            mpPaymentId: null,
            preferenceVersion: { increment: 1 }
          }
        });
      }
    }, { timeout: INTERACTIVE_TX_TIMEOUT_MS });

    const payment = await paymentService.createPreference(newOrderId);
    return { orderId: newOrderId, payment };
  }

  async createPaymentForRegistrations(
    registrationIds: string[],
    paymentMethod?: PaymentMethod,
    actor?: ActorUser
  ) {
    const uniqueRegistrationIds = Array.from(
      new Set(registrationIds.map((id) => id.trim()).filter(Boolean))
    );
    if (!uniqueRegistrationIds.length) {
      throw new AppError("Informe ao menos uma inscricao para gerar pagamento", 400);
    }

    const registrations = await prisma.registration.findMany({
      where: { id: { in: uniqueRegistrationIds } },
      include: {
        order: {
          include: {
            registrations: true
          }
        },
        event: true
      }
    });

    if (!registrations.length || registrations.length !== uniqueRegistrationIds.length) {
      throw new NotFoundError("Algumas inscricoes nao foram encontradas");
    }

    const eventId = registrations[0].eventId;
    if (!registrations.every((reg) => reg.eventId === eventId)) {
      throw new AppError("Selecione apenas inscricoes do mesmo evento", 400);
    }

    const event = registrations[0].event;
    if (!event || !event.isActive) {
      throw new AppError("Evento indisponivel para pagamento", 400);
    }

    if (!event.districtId) {
      throw new AppError("Evento sem distrito associado", 400);
    }

    const disallowedStatuses = new Set<RegistrationStatus>([
      RegistrationStatus.PAID,
      RegistrationStatus.CHECKED_IN,
      RegistrationStatus.REFUNDED
    ]);

    for (const reg of registrations) {
      if (disallowedStatuses.has(reg.status as RegistrationStatus)) {
        throw new AppError(
          `Inscricao ${reg.fullName ?? reg.id} ja paga ou confirmada. Remova-a da selecao.`,
          400
        );
      }
    }

    const allowedMethods = parsePaymentMethods(event.paymentMethods);
    const requestedMethod = paymentMethod;
    const fallbackMethod =
      allowedMethods[0] ?? DEFAULT_PAYMENT_METHODS[0] ?? PaymentMethod.PIX_MP;
    let resolvedMethod =
      requestedMethod && (allowedMethods.includes(requestedMethod) || AdminOnlyPaymentMethods.includes(requestedMethod as any))
        ? requestedMethod
        : fallbackMethod;

    if (AdminOnlyPaymentMethods.includes(resolvedMethod as PaymentMethod)) {
      if (!actor?.id || !actor.role) {
        throw new AppError("Este metodo de pagamento e exclusivo para administradores", 403);
      }
      const isAdmin = actor.role === "AdminGeral" || actor.role === "AdminDistrital";
      if (!isAdmin) {
        throw new AppError("Este metodo de pagamento e exclusivo para administradores", 403);
      }
    }

    const isFreeEvent = Boolean((event as any).isFree);
    const isFreePaymentMethod = FreePaymentMethods.includes(resolvedMethod as PaymentMethod);

    if (isFreeEvent && !isFreePaymentMethod) {
      resolvedMethod = PaymentMethod.PIX_MP;
    }

    const prices = registrations.map((reg) =>
      typeof reg.priceCents === "number" ? reg.priceCents : reg.event?.priceCents ?? 0
    );
    const totalCents = prices.reduce((acc, price) => acc + (price ?? 0), 0);

    const orderStatus =
      isFreeEvent || isFreePaymentMethod || totalCents === 0
        ? OrderStatus.PAID
        : OrderStatus.PENDING;
    const paidAtValue = orderStatus === OrderStatus.PAID ? new Date() : null;

    const buyerCpf =
      sanitizeCpf(
        registrations[0].order?.buyerCpf ?? registrations[0].cpf ?? registrations[0].order?.responsibleDocument ?? ""
      ) || sanitizeCpf(registrations[0].cpf) || "00000000000";
    const orderId = randomUUID();
    const expiresAt = resolveOrderExpirationDate(resolvedMethod);
    const districtAdminId = await this.resolveDistrictAdminId(event.districtId);

    const previousOrderIds = new Set<string>();
    registrations.forEach((reg) => previousOrderIds.add(reg.orderId));

    const order = await prisma.$transaction(async (tx) => {
      const createdOrder = await tx.order.create({
        data: {
          id: orderId,
          eventId,
          buyerCpf,
          totalCents,
          status: orderStatus,
          paymentMethod: resolvedMethod,
          externalReference: orderId,
          expiresAt,
          pricingLotId: null,
          mpPaymentId: null,
          mpPreferenceId: null,
          preferenceVersion: 0,
          paidAt: paidAtValue,
          districtId: event.districtId,
          districtAdminId,
          responsibleUserId: event.createdById ?? null,
          amountToTransfer: orderStatus === OrderStatus.PAID ? totalCents : 0,
          transferStatus: orderStatus === OrderStatus.PAID ? OrderTransferStatus.PENDING : null
        }
      });

      const registrationUpdateData: Prisma.RegistrationUncheckedUpdateManyInput = {
        orderId: createdOrder.id,
        paymentMethod: resolvedMethod,
        status:
          orderStatus === OrderStatus.PAID
            ? RegistrationStatus.PAID
            : RegistrationStatus.PENDING_PAYMENT,
        paidAt: paidAtValue
      };

      if (event.createdById) {
        registrationUpdateData.responsibleUserId = event.createdById;
      }

      await tx.registration.updateMany({
        where: { id: { in: registrations.map((reg) => reg.id) } },
        data: registrationUpdateData
      });

      const oldOrderIds = Array.from(previousOrderIds).filter(
        (id) => id && id !== createdOrder.id
      );
      const remainingByOrder = oldOrderIds.length
        ? await tx.registration.groupBy({
            by: ["orderId"],
            where: { orderId: { in: oldOrderIds } },
            _sum: { priceCents: true },
            _count: { _all: true }
          })
        : [];
      const remainingByOrderMap = new Map(
        remainingByOrder.map((summary) => [summary.orderId, summary])
      );

      for (const oldOrderId of oldOrderIds) {
        const summary = remainingByOrderMap.get(oldOrderId);
        const remainingCount = summary?._count?._all ?? 0;

        if (!remainingCount) {
          await tx.order.update({
            where: { id: oldOrderId },
            data: {
              totalCents: 0,
              status: OrderStatus.CANCELED,
              mpPreferenceId: null,
              mpPaymentId: null,
              manualPaymentReference: null,
              manualPaymentProofUrl: null,
              paidAt: null,
              preferenceVersion: { increment: 1 }
            }
          });
          continue;
        }

        const newTotal = summary?._sum?.priceCents ?? 0;
        await tx.order.update({
          where: { id: oldOrderId },
          data: {
            totalCents: newTotal,
            status: newTotal > 0 ? OrderStatus.PENDING : OrderStatus.CANCELED,
            mpPreferenceId: null,
            mpPaymentId: null,
            preferenceVersion: { increment: 1 }
          }
        });
      }

      return createdOrder;
    }, { timeout: INTERACTIVE_TX_TIMEOUT_MS });

    let payment: any = null;
    if (
      order.status === OrderStatus.PENDING &&
      !ManualPaymentMethods.includes(resolvedMethod as PaymentMethod)
    ) {
      try {
        payment = await paymentService.createPreference(order.id);
      } catch (error) {
        logger.warn(
          { orderId: order.id, error },
          "Falha ao gerar preferencia para pagamento em massa de inscricoes"
        );
      }
    }

    return {
      orderId: order.id,
      status: order.status,
      paymentMethod: resolvedMethod,
      totalCents,
      payment
    };
  }
  async markPaid(
    orderId: string,
    paymentId: string,
    options?: {
      preferenceVersion?: number | null;
      paidAt?: Date;
      manualReference?: string | null;
      paymentMethod?: PaymentMethod;
      actorUserId?: string | null;
      paymentProofUrl?: string | null;
    }
  ) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        registrations: true,
        event: {
          select: {
            districtId: true,
            createdById: true
          }
        }
      }
    });
    if (!order) throw new NotFoundError("Pedido nao encontrado");

    const orderColumns = await resolveOrderColumns();

    const paidAt = options?.paidAt ?? new Date();
    const paymentMethod =
      options?.paymentMethod ?? (order.paymentMethod as PaymentMethod) ?? PaymentMethod.PIX_MP;
    const manualReference =
      options?.manualReference ?? (isManualPayment(paymentId) ? paymentId : null);
    const shouldUpdateProof = Object.prototype.hasOwnProperty.call(options ?? {}, "paymentProofUrl");
    const newProofUrl = shouldUpdateProof ? options?.paymentProofUrl ?? null : undefined;

    if (order.status === OrderStatus.PAID) {
      const updatedOrder = await prisma.$transaction(async (tx) => {
        const {
          hasAmountToTransfer,
          hasTransferStatus,
          hasTransferBatchId,
          hasDistrictId,
          hasDistrictAdminId,
          hasResponsibleUserId
        } = orderColumns;

        const transferAmount = Math.max(
          order.amountToTransfer ?? order.netAmountCents ?? order.totalCents,
          0
        );

        const districtId = hasDistrictId
          ? resolveOrderDistrictId(
              order.registrations ?? [],
              order.event?.districtId ?? order.districtId ?? null
            )
          : null;
        const districtAdminId =
          hasDistrictAdminId && districtId
            ? await this.resolveDistrictAdminId(districtId, tx)
            : null;
        const responsibleUserId = hasResponsibleUserId
          ? order.responsibleUserId ?? order.event?.createdById ?? null
          : null;

        const updateData: any = {};
        if (shouldUpdateProof) {
          updateData.manualPaymentProofUrl = newProofUrl ?? null;
        }
        if (
          hasAmountToTransfer &&
          (!order.amountToTransfer || order.amountToTransfer !== transferAmount)
        ) {
          updateData.amountToTransfer = transferAmount;
        }
        if (hasDistrictId && districtId && order.districtId !== districtId) {
          updateData.districtId = districtId;
        }
        if (
          hasDistrictAdminId &&
          (order.districtAdminId ?? null) !== (districtAdminId ?? null)
        ) {
          updateData.districtAdminId = districtAdminId;
        }
        if (
          hasResponsibleUserId &&
          (order.responsibleUserId ?? null) !== (responsibleUserId ?? null)
        ) {
          updateData.responsibleUserId = responsibleUserId;
        }
        if (hasTransferStatus && isPendingTransferStatus(order.transferStatus)) {
          updateData.transferStatus = OrderTransferStatus.PENDING;
          if (hasTransferBatchId) {
            updateData.transferBatchId = null;
          }
        }

        if (!Object.keys(updateData).length) {
          return order;
        }

        return tx.order.update({
          where: { id: orderId },
          data: updateData
        });
      }, { timeout: INTERACTIVE_TX_TIMEOUT_MS });

      if (shouldUpdateProof && order.manualPaymentProofUrl && order.manualPaymentProofUrl !== newProofUrl) {
        await storageService.deleteByUrl(order.manualPaymentProofUrl).catch(() => undefined);
      }
      return updatedOrder;
    }

    let effectiveVersion = options?.preferenceVersion ?? null;
    if (!effectiveVersion && !isManualPayment(paymentId)) {
      try {
        const payment = await paymentService.fetchPayment(paymentId);
        effectiveVersion = extractPreferenceVersion((payment as any)?.metadata);
      } catch (error) {
        logger.warn(
          { orderId, paymentId, error },
          "Falha ao recuperar detalhes do pagamento para validar preferencia ativa"
        );
      }
    }

    if (
      effectiveVersion &&
      order.preferenceVersion > 0 &&
      effectiveVersion !== order.preferenceVersion
    ) {
      logger.warn(
        {
          orderId,
          paymentId,
          receivedVersion: effectiveVersion,
          activeVersion: order.preferenceVersion
        },
        "Pagamento associado a preferencia expirada foi ignorado"
      );
      return order;
    }

    // Calcular taxas do Mercado Pago se for pagamento via MP
    let feeCents = 0;
    let netAmountCents = order.totalCents;
    
    if (paymentMethod === PaymentMethod.PIX_MP && !isManualPayment(paymentId)) {
      try {
        const payment = await paymentService.fetchPayment(paymentId);
        const fees = calculateMercadoPagoFees(payment, order.totalCents);
        feeCents = fees.feeCents;
        netAmountCents = fees.netAmountCents;
      } catch (error) {
        logger.warn(
          { orderId, paymentId, error },
          "Falha ao calcular taxas do Mercado Pago. Usando valores padrão."
        );
        // Em caso de erro, não aplicar taxas (assumir 0)
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const {
        hasFeeCents,
        hasNetAmountCents,
        hasAmountToTransfer,
        hasDistrictId,
        hasDistrictAdminId,
        hasTransferStatus,
        hasTransferBatchId,
        hasResponsibleUserId
      } = orderColumns;

      const updateData: any = {
        status: OrderStatus.PAID,
        mpPaymentId: paymentId,
        paymentMethod,
        paidAt,
        manualPaymentReference: manualReference
      };
      if (shouldUpdateProof) {
        updateData.manualPaymentProofUrl = newProofUrl ?? null;
      }

      const transferAmount = Math.max(netAmountCents ?? order.totalCents, 0);
      const districtId = hasDistrictId
        ? resolveOrderDistrictId(
            order.registrations ?? [],
            order.event?.districtId ?? order.districtId ?? null
          )
        : null;
      const districtAdminId =
        hasDistrictAdminId && districtId
          ? await this.resolveDistrictAdminId(districtId, tx)
          : null;
      const responsibleUserId = hasResponsibleUserId
        ? order.responsibleUserId ?? order.event?.createdById ?? null
        : null;
      const transferStatus =
        order.transferStatus === OrderTransferStatus.TRANSFERRED
          ? order.transferStatus
          : OrderTransferStatus.PENDING;

      // Adicionar campos financeiros apenas se existirem
      if (hasFeeCents) {
        updateData.feeCents = feeCents;
      }
      if (hasNetAmountCents) {
        updateData.netAmountCents = netAmountCents;
      }
      if (hasAmountToTransfer) {
        updateData.amountToTransfer = transferAmount;
      }
      if (hasDistrictId && districtId && order.districtId !== districtId) {
        updateData.districtId = districtId;
      }
      if (
        hasDistrictAdminId &&
        (order.districtAdminId ?? null) !== (districtAdminId ?? null)
      ) {
        updateData.districtAdminId = districtAdminId;
      }
      if (
        hasResponsibleUserId &&
        (order.responsibleUserId ?? null) !== (responsibleUserId ?? null)
      ) {
        updateData.responsibleUserId = responsibleUserId;
      }
      if (hasTransferStatus && transferStatus && order.transferStatus !== OrderTransferStatus.TRANSFERRED) {
        updateData.transferStatus = transferStatus;
        if (hasTransferBatchId) {
          updateData.transferBatchId = null;
        }
      }

      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: updateData
      });

      await tx.registration.updateMany({
        where: { orderId },
        data: {
          status: RegistrationStatus.PAID,
          paidAt,
          paymentMethod,
          responsibleUserId: order.event?.createdById ?? order.responsibleUserId ?? null
        }
      });
      return updatedOrder;
    }, { timeout: INTERACTIVE_TX_TIMEOUT_MS });

    if (shouldUpdateProof && order.manualPaymentProofUrl && order.manualPaymentProofUrl !== newProofUrl) {
      await storageService.deleteByUrl(order.manualPaymentProofUrl).catch(() => undefined);
    }
    await registrationService.generateReceiptsForOrder(orderId);
    await auditService.log({
      actorUserId: options?.actorUserId ?? undefined,
      action: "ORDER_PAID",
      entity: "order",
      entityId: orderId,
      metadata: { paymentId, paymentMethod }
    });
    return updated;
  }

  async markRefunded({
    orderId,
    registrationId,
    amountCents,
    mpRefundId,
    reason,
    actorUserId
  }: {
    orderId: string;
    registrationId: string;
    amountCents: number;
    mpRefundId: string;
    reason?: string;
    actorUserId?: string | null;
  }) {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundError("Pedido nao encontrado");

    await prisma.$transaction([
      prisma.registration.update({
        where: { id: registrationId },
        data: { status: RegistrationStatus.REFUNDED }
      }),
      prisma.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.PARTIALLY_REFUNDED }
      }),
      prisma.refund.create({
        data: { orderId, registrationId, amountCents, mpRefundId, reason }
      })
    ]);

    await auditService.log({
      actorUserId: actorUserId ?? undefined,
      action: "REGISTRATION_REFUNDED",
      entity: "registration",
      entityId: registrationId,
      metadata: { orderId, amountCents }
    });
  }

  async markManualRegistrationsPaid(
    registrationIds: string[],
    options?: { paidAt?: Date; reference?: string; paymentMethod?: PaymentMethod },
    actorUserId?: string | null
  ) {
    if (!registrationIds.length) {
      throw new AppError("Informe ao menos uma inscricao para quitacao", 400);
    }

    const registrations = await prisma.registration.findMany({
      where: { id: { in: registrationIds } },
      include: {
        order: true,
        event: true
      }
    });

    if (!registrations.length) {
      throw new NotFoundError("Nenhuma inscricao encontrada para quitacao");
    }

    const eventIds = new Set(registrations.map((r) => r.eventId));
    if (eventIds.size > 1) {
      throw new AppError("Selecione apenas inscricoes do mesmo evento para confirmar manualmente.", 400);
    }

    const event = registrations[0].event;
    if (!event || !event.isActive) {
      throw new AppError("Evento indisponivel para confirmacao.", 400);
    }

    const allowedMethods = parsePaymentMethods(event.paymentMethods);
    if (!allowedMethods.length) {
      throw new AppError("Evento sem formas de pagamento configuradas.", 400);
    }

    const grouped = new Map<
      string,
      {
        paymentMethod: PaymentMethod;
        registrationIds: string[];
        statusSet: Set<string>;
      }
    >();

    for (const registration of registrations) {
      const methodFromOrder = (registration.order.paymentMethod as PaymentMethod) ?? PaymentMethod.PIX_MP;
      const methodToUse =
        options?.paymentMethod && allowedMethods.includes(options.paymentMethod)
          ? options.paymentMethod
          : allowedMethods.includes(methodFromOrder)
            ? methodFromOrder
            : allowedMethods[0];

      if (!allowedMethods.includes(methodToUse)) {
        throw new AppError(`Metodo de pagamento nao permitido para o evento.`, 400);
      }
      if (registration.status === RegistrationStatus.PAID) {
        continue;
      }
      if (registration.status !== RegistrationStatus.PENDING_PAYMENT) {
        throw new AppError(
          `Inscricao ${registration.id} nao esta pendente para pagamento.`,
          400
        );
      }
      const group = grouped.get(registration.orderId) ?? {
        paymentMethod: methodToUse,
        registrationIds: [],
        statusSet: new Set<string>()
      };
      group.registrationIds.push(registration.id);
      group.statusSet.add(registration.status);
      grouped.set(registration.orderId, group);
    }

    if (!grouped.size) {
      throw new AppError("As inscricoes selecionadas ja estao quitadas.", 400);
    }

    const paidAt = options?.paidAt ?? new Date();
    const reference = options?.reference ?? `MANUAL-BATCH-${Date.now()}`;

    for (const [orderId, group] of grouped.entries()) {
      await this.markPaid(orderId, reference, {
        paidAt,
        manualReference: reference,
        paymentMethod: group.paymentMethod,
        actorUserId: actorUserId ?? undefined
      });
    }

    return {
      ordersPaid: Array.from(grouped.keys()),
      paidAt,
      reference
    };
  }
}

export const orderService = new OrderService();


