import { randomUUID } from "crypto";

import { OrderStatus, RegistrationStatus, type OrderStatus as OrderStatusValue } from "../../config/statuses";
import { prisma } from "../../lib/prisma";
import { AppError, NotFoundError } from "../../utils/errors";
import { auditService } from "../../services/audit.service";
import { paymentService, extractPreferenceVersion, resolveCurrentLotPriceCents } from "../../services/payment.service";
import { registrationService } from "../registrations/registration.service";
import { eventService } from "../events/event.service";
import { storageService } from "../../storage/storage.service";
import { sanitizeCpf } from "../../utils/mask";
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
import { getActivePixProvider } from "../payments/pix-gateway";
import { pixPaymentService } from "../payments/pix.service";

type GenderInput = Gender | "MASCULINO" | "FEMININO" | "OUTRO";

type BatchPerson = {
  fullName: string;
  cpf: string;
  birthDate: string;
  gender: GenderInput;
  districtId: string;
  churchId: string;
  photoUrl?: string | null;
};

const isManualPayment = (paymentId: string) => paymentId.startsWith("MANUAL-");

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
            pendingPaymentValueRule: true
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

        return {
          ...order,
          totalCents: unitPriceCents * order.registrations.length,
          registrations: order.registrations.map((registration) => ({
            ...registration,
            priceCents: unitPriceCents
          })),
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
            pendingPaymentValueRule: true
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

        return {
          ...order,
          totalCents: unitPriceCents * order.registrations.length,
          registrations: order.registrations.map((registration) => ({
            ...registration,
            priceCents: unitPriceCents
          })),
          pendingPricingRule: pricingRule
        };
      })
    );
  }

  private async resolveDistrictAdminId(districtId: string | null, tx: typeof prisma = prisma) {
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
  }, actor?: Express.User | undefined) {
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
      payload.people.map(async (person) => {
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
          gender: parseGender(person.gender)
        };
      })
    );

    const orderDistrictId = event.districtId;
    const districtAdminId = await this.resolveDistrictAdminId(orderDistrictId);

    const orderId = randomUUID();
    const expiresAt = resolveOrderExpirationDate(resolvedMethod);

    const registrations = await prisma.$transaction(async (tx) => {
      // Limpar inscrições e pedidos anteriores (pendentes/cancelados/expirados) para os CPFs informados
      for (const person of peoplePrepared) {
        const existing = await tx.registration.findFirst({
          where: {
            eventId: payload.eventId,
            cpf: person.cpf
          },
          include: {
            order: {
              include: { registrations: true }
            }
          }
        });

        if (!existing) continue;

        const order = existing.order;
        if (order && (order.status as OrderStatus) === OrderStatus.PAID) {
          throw new ConflictError(`CPF ${maskCpf(existing.cpf)} ja possui inscricao paga para este evento.`);
        }

        // Apagar inscrição anterior
        await tx.registration.delete({ where: { id: existing.id } });

        // Se o pedido antigo estava pendente/cancelado/expirado, ajustar ou remover
        if (order && [OrderStatus.PENDING, OrderStatus.CANCELED, OrderStatus.EXPIRED].includes(order.status as OrderStatus)) {
          const remaining = order.registrations.filter((r) => r.id !== existing.id);
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

      // Se for metodo gratuito, marcar como pago automaticamente
      const orderStatus = (isFreeEvent || isFreePaymentMethod) ? OrderStatus.PAID : OrderStatus.PENDING;
      const paidAtValue = (isFreeEvent || isFreePaymentMethod) ? new Date() : null;
      const order = await tx.order.create({
        data: {
          id: orderId,
          eventId: payload.eventId,
          buyerCpf: sanitizeCpf(payload.buyerCpf),
          totalCents: unitPriceCents * payload.people.length,
          status: orderStatus,
          paymentMethod: resolvedMethod,
          externalReference: orderId,
          expiresAt,
          pricingLotId: activeLot?.id ?? null,
          mpPaymentId: (isFreeEvent || isFreePaymentMethod) ? `MANUAL-FREE-${Date.now()}` : null,
          paidAt: paidAtValue,
          districtId: orderDistrictId,
          districtAdminId,
          responsibleUserId: event.createdById ?? null,
          amountToTransfer: orderStatus === OrderStatus.PAID ? unitPriceCents * payload.people.length : 0,
          transferStatus: orderStatus === OrderStatus.PAID ? OrderTransferStatus.PENDING : null
        }
      });

      const regs = [];
      for (const person of peoplePrepared) {
        const ageYears = registrationService.computeAge(person.birthDate);
        if (event.minAgeYears && ageYears < event.minAgeYears) {
          throw new AppError(`Participante ${person.fullName} nao atende idade minima`, 400);
        }

        // Garantir que a data de nascimento seja salva como UTC midnight do dia correto
        // Quando recebemos "1998-11-05", queremos salvar como "1998-11-05T00:00:00.000Z"
        // Isso garante que ao formatar usando UTC, a data será exibida corretamente
        const birthDateParts = person.birthDate.split('-');
        const birthDateUTC = new Date(Date.UTC(
          parseInt(birthDateParts[0], 10), // ano
          parseInt(birthDateParts[1], 10) - 1, // mês (0-indexed)
          parseInt(birthDateParts[2], 10) // dia
        ));

        const registration = await tx.registration.create({
          data: {
            orderId: order.id,
            eventId: payload.eventId,
            fullName: person.fullName,
            cpf: person.cpf,
            birthDate: birthDateUTC,
            ageYears,
            districtId: person.districtId,
            churchId: person.churchId,
            photoUrl: person.storedPhoto,
            gender: person.gender,
            paymentMethod: resolvedMethod,
            ministryId: event.ministryId,
            status: (isFreeEvent || isFreePaymentMethod)
              ? RegistrationStatus.PAID
              : RegistrationStatus.PENDING_PAYMENT,
            responsibleUserId: event.createdById ?? null,
            priceCents: unitPriceCents,
            paidAt: paidAtValue
          }
        });
        regs.push(registration);
      }

      return { order, registrations: regs };
    });

    await auditService.log({
      action: "ORDER_CREATED",
      entity: "order",
      entityId: registrations.order.id,
      metadata: {
        count: registrations.registrations.length,
        eventId: payload.eventId,
        buyerCpf: sanitizeCpf(payload.buyerCpf),
        paymentMethod: resolvedMethod
      }
    });

    if (isFreeEvent || isFreePaymentMethod) {
      await registrationService.generateReceiptsForOrder(registrations.order.id);
      return {
        orderId: registrations.order.id,
        registrationIds: registrations.registrations.map((r) => r.id),
        payment: {
          status: OrderStatus.PAID,
          paymentMethod: resolvedMethod,
          participantCount: payload.people.length,
          totalCents: 0,
          isFree: true
        }
      };
    }

    if (isManualMethod) {
      return {
        orderId: registrations.order.id,
        registrationIds: registrations.registrations.map((r) => r.id),
        payment: {
          status: OrderStatus.PENDING,
          paymentMethod: resolvedMethod,
          participantCount: payload.people.length,
          totalCents: unitPriceCents * payload.people.length,
          isManual: true
        }
      };
    }

    let payment;
    try {
      payment = await paymentService.createPreference(registrations.order.id);
    } catch (error) {
      logger.error(
        { orderId: registrations.order.id, error },
        "Falha ao gerar preferencia de pagamento"
      );
      await prisma.registration.deleteMany({ where: { orderId: registrations.order.id } });
      await prisma.order.delete({ where: { id: registrations.order.id } });
      throw new AppError("Nao foi possivel gerar o pagamento. Tente novamente.", 502);
    }

    return {
      orderId: registrations.order.id,
      registrationIds: registrations.registrations.map((r) => r.id),
      payment: {
        ...payment,
        paymentMethod: resolvedMethod,
        participantCount: payload.people.length,
        totalCents: unitPriceCents * payload.people.length
      }
    };
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
    const paymentRule = isPendingPaymentValueRule(order.event?.pendingPaymentValueRule)
      ? (order.event?.pendingPaymentValueRule as PendingPaymentValueRule)
      : DEFAULT_PENDING_PAYMENT_VALUE_RULE;
    let totalCents = order.totalCents;
    let needsPriceUpdate = false;
    let recalculatedUnitPrice: number | null = null;
    if (paymentRule === "UPDATE_TO_ACTIVE_LOT" && participantCount > 0) {
      const unitPriceCents = await resolveCurrentLotPriceCents(order.eventId, fallbackPriceCents);
      totalCents = unitPriceCents * participantCount;
      recalculatedUnitPrice = unitPriceCents;
      needsPriceUpdate = totalCents !== order.totalCents;
    }

    if (needsPriceUpdate && recalculatedUnitPrice !== null) {
      await prisma.$transaction([
        prisma.order.update({
          where: { id: order.id },
          data: { totalCents }
        }),
        prisma.registration.updateMany({
          where: { orderId: order.id },
          data: { priceCents: recalculatedUnitPrice }
        })
      ]);
      order.totalCents = totalCents;
      order.registrations.forEach((registration) => {
        registration.priceCents = recalculatedUnitPrice as number;
      });
    }

    const isManualMethod = ManualPaymentMethods.includes(paymentMethod);

    const participants = order.registrations.map((registration) => ({
      id: registration.id,
      fullName: registration.fullName,
      status: registration.status
    }));
    const manualPaymentProofUrl = order.manualPaymentProofUrl ?? undefined;

    const isFreeEvent = Boolean((order.event as any)?.isFree);
    if (isFreeEvent) {
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
      return {
        status: order.status,
        paymentId: pixPayment.chargeId ?? order.mpPaymentId,
        paymentMethod,
        participantCount,
        participants,
        totalCents,
        pixQrData: pixPayment.pixQrData ?? undefined,
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

    // Se j� houver um pagamento no MP (mesmo pendente), tentar extrair o QR dele
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

    // Como fallback final, gerar um pagamento PIX especifico para obter o QR
    if (!pixQrData && paymentMethod === PaymentMethod.PIX_MP) {
      try {
      const pix = await paymentService.createPixPaymentForOrder(orderId);
        pixQrData = pix.pixQrData ?? pixQrData;
      } catch (error) {
        logger.warn({ orderId, error }, "Falha ao criar pagamento PIX para gerar QR");
      }
    }

    return {
      ...payment,
      pixQrData,
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
    const columns = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = DATABASE() AND table_name = 'Order'
    `;
    const columnNames = columns.map((col) => col.column_name);
    const hasFeeCents = columnNames.includes("feeCents");
    const hasNetAmountCents = columnNames.includes("netAmountCents");

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
      registration.priceCents && registration.priceCents > 0
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
    });

    const payment = await paymentService.createPreference(newOrderId);
    return { orderId: newOrderId, payment };
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

    const paidAt = options?.paidAt ?? new Date();
    const paymentMethod =
      options?.paymentMethod ?? (order.paymentMethod as PaymentMethod) ?? PaymentMethod.PIX_MP;
    const manualReference =
      options?.manualReference ?? (isManualPayment(paymentId) ? paymentId : null);
    const shouldUpdateProof = Object.prototype.hasOwnProperty.call(options ?? {}, "paymentProofUrl");
    const newProofUrl = shouldUpdateProof ? options?.paymentProofUrl ?? null : undefined;

    if (order.status === OrderStatus.PAID) {
      const updatedOrder = await prisma.$transaction(async (tx) => {
        const orderColumns = await tx.$queryRaw<Array<{ column_name: string }>>`
          SELECT column_name
          FROM information_schema.columns
          WHERE table_schema = DATABASE() AND table_name = 'Order'
        `;
        const columnNames = orderColumns.map((col) => col.column_name);
        const hasAmountToTransfer = columnNames.includes("amountToTransfer");
        const hasTransferStatus = columnNames.includes("transferStatus");
        const hasTransferBatchId = columnNames.includes("transferBatchId");
        const hasDistrictId = columnNames.includes("districtId");
        const hasDistrictAdminId = columnNames.includes("districtAdminId");
        const hasResponsibleUserId = columnNames.includes("responsibleUserId");

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
      });

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
      const orderColumns = await tx.$queryRaw<Array<{ column_name: string }>>`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = DATABASE() AND table_name = 'Order'
      `;
      const columnNames = orderColumns.map((col) => col.column_name);
      const hasFeeCents = columnNames.includes("feeCents");
      const hasNetAmountCents = columnNames.includes("netAmountCents");
      const hasAmountToTransfer = columnNames.includes("amountToTransfer");
      const hasDistrictId = columnNames.includes("districtId");
      const hasDistrictAdminId = columnNames.includes("districtAdminId");
      const hasTransferStatus = columnNames.includes("transferStatus");
      const hasTransferBatchId = columnNames.includes("transferBatchId");
      const hasResponsibleUserId = columnNames.includes("responsibleUserId");

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
    });

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
    options?: { paidAt?: Date; reference?: string },
    actorUserId?: string | null
  ) {
    if (!registrationIds.length) {
      throw new AppError("Informe ao menos uma inscricao para quitacao", 400);
    }

    const registrations = await prisma.registration.findMany({
      where: { id: { in: registrationIds } },
      include: {
        order: true
      }
    });

    if (!registrations.length) {
      throw new NotFoundError("Nenhuma inscricao encontrada para quitacao");
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
      const method = (registration.order.paymentMethod as PaymentMethod) ?? PaymentMethod.PIX_MP;
      if (!ManualPaymentMethods.includes(method)) {
        throw new AppError(
          `Inscricao ${registration.id} nao utiliza pagamento manual. Utilize o fluxo do provedor.`,
          400
        );
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
        paymentMethod: method,
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




