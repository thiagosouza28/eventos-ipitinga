import { randomUUID } from "crypto";

import { env } from "../../config/env";
import { OrderStatus, RegistrationStatus, type OrderStatus as OrderStatusValue } from "../../config/statuses";
import { prisma } from "../../lib/prisma";
import { AppError, NotFoundError } from "../../utils/errors";
import { auditService } from "../../services/audit.service";
import { paymentService, extractPreferenceVersion } from "../../services/payment.service";
import { registrationService } from "../registrations/registration.service";
import { eventService } from "../events/event.service";
import { storageService } from "../../storage/storage.service";
import { sanitizeCpf } from "../../utils/mask";
import { logger } from "../../utils/logger";
import {
  DEFAULT_PAYMENT_METHODS,
  ManualPaymentMethods,
  AdminOnlyPaymentMethods,
  FreePaymentMethods,
  PaymentMethod,
  parsePaymentMethods
} from "../../config/payment-methods";
import { Gender, parseGender } from "../../config/gender";
import { calculateMercadoPagoFees } from "../../utils/mercado-pago-fees";

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

export class OrderService {
  async findAllPendingOrders(cpf: string) {
    const orders = await prisma.order.findMany({
      where: {
        buyerCpf: sanitizeCpf(cpf),
        status: "PENDING",
        expiresAt: {
          gt: new Date() // Only non-expired orders
        }
      },
      include: {
        registrations: true,
        event: {
          select: {
            id: true,
            title: true
          }
        }
      }
    });
    return orders;
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
        event: true
      }
    });
    return orders;
  }

  async createBatch(payload: {
    eventId: string;
    buyerCpf: string;
    people: BatchPerson[];
    paymentMethod?: PaymentMethod;
  }, actorId?: string, actorRole?: string) {
    if (!payload.people.length) {
      throw new AppError("Informe ao menos uma inscricao", 400);
    }

    const event = await prisma.event.findUnique({ where: { id: payload.eventId } });
    if (!event || !event.isActive) {
      throw new NotFoundError("Evento nao disponivel");
    }

    const allowedMethods = parsePaymentMethods(event.paymentMethods);
    const requestedMethod = payload.paymentMethod;
    const fallbackMethod =
      allowedMethods[0] ?? DEFAULT_PAYMENT_METHODS[0] ?? PaymentMethod.PIX_MP;
    let resolvedMethod =
      requestedMethod && allowedMethods.includes(requestedMethod)
        ? requestedMethod
        : fallbackMethod;

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

    for (const person of payload.people) {
      await registrationService.ensureUniqueCpf(payload.eventId, sanitizeCpf(person.cpf));
    }

    const peoplePrepared = await Promise.all(
      payload.people.map(async (person) => {
        const cpf = sanitizeCpf(person.cpf);
        const storedPhoto = person.photoUrl
          ? await storageService.saveBase64Image(person.photoUrl)
          : null;
        return {
          ...person,
          cpf,
          storedPhoto,
          gender: parseGender(person.gender)
        };
      })
    );

    const orderId = randomUUID();
    const expiresAt = new Date(Date.now() + env.ORDER_EXPIRATION_MINUTES * 60 * 1000);

    const registrations = await prisma.$transaction(async (tx) => {
      // Se for método gratuito, marcar como pago automaticamente
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
          paidAt: paidAtValue
        }
      });

      const regs = [];
      for (const person of peoplePrepared) {
        const ageYears = registrationService.computeAge(person.birthDate);
        if (event.minAgeYears && ageYears < event.minAgeYears) {
          throw new AppError(`Participante ${person.fullName} nao atende idade minima`, 400);
        }

        const registration = await tx.registration.create({
          data: {
            orderId: order.id,
            eventId: payload.eventId,
            fullName: person.fullName,
            cpf: person.cpf,
            birthDate: new Date(person.birthDate),
            ageYears,
            districtId: person.districtId,
            churchId: person.churchId,
            photoUrl: person.storedPhoto,
            gender: person.gender,
            paymentMethod: resolvedMethod,
            status: (isFreeEvent || isFreePaymentMethod)
              ? RegistrationStatus.PAID
              : RegistrationStatus.PENDING_PAYMENT,
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
    if (order.status === "CANCELED" || order.status === "EXPIRED") {
      throw new AppError("Pedido expirado ou cancelado", 400);
    }
    const participantCount = order.registrations.length;

    const totalCents = order.registrations.reduce((sum, registration) => {
      const price = registration.priceCents ?? order.event.priceCents;
      return sum + price;
    }, 0);

    const paymentMethod = (order.paymentMethod as PaymentMethod) ?? PaymentMethod.PIX_MP;
    const isManualMethod = ManualPaymentMethods.includes(paymentMethod);

    const participants = order.registrations.map((registration) => ({
      id: registration.id,
      fullName: registration.fullName,
      status: registration.status
    }));

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
        isFree: true
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
        paidAt: order.paidAt
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
        paidAt: order.paidAt
      };
    }

    const latestPayment = await paymentService.findLatestPaymentByExternalReference(orderId);
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
        return {
          status: updated.status,
          paymentId: updated.mpPaymentId,
          paymentMethod,
          participantCount,
          participants,
          totalCents,
          paidAt: updated.paidAt
        };
      }
    }

    let preference;
    if (order.mpPreferenceId && order.expiresAt && order.expiresAt > new Date()) {
      try {
        preference = await paymentService.getPreference(order.mpPreferenceId);
      } catch (error) {
        logger.warn({ orderId, error }, "Falha ao reaproveitar preferencia existente. Gerando nova.");
      }
    }

    const payment =
      preference ?? (await paymentService.createPreference(orderId));
    return {
      ...payment,
      status: latestStatus ?? order.status,
      statusDetail: latestPayment?.statusDetail,
      paymentMethod,
      participantCount,
      participants,
      totalCents
    };
  }

  async list(filters: { eventId?: string; status?: OrderStatusValue }) {
    return prisma.order.findMany({
      where: {
        eventId: filters.eventId,
        status: filters.status
      },
      include: {
        registrations: true,
        refunds: true
      },
      orderBy: { createdAt: "desc" }
    });
  }

  async markPaid(
    orderId: string,
    paymentId: string,
    options?: {
      preferenceVersion?: number | null;
      paidAt?: Date;
      manualReference?: string | null;
      paymentMethod?: PaymentMethod;
    }
  ) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { registrations: true }
    });
    if (!order) throw new NotFoundError("Pedido nao encontrado");

    if (order.status === "PAID") return order;

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

    const paidAt = options?.paidAt ?? new Date();
    const paymentMethod =
      options?.paymentMethod ?? (order.paymentMethod as PaymentMethod) ?? PaymentMethod.PIX_MP;
    const manualReference =
      options?.manualReference ?? (isManualPayment(paymentId) ? paymentId : null);

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
      // Verificar se as colunas existem antes de tentar atualizar
      const orderColumns = await tx.$queryRawUnsafe<Array<{ name: string }>>(`PRAGMA table_info("Order")`);
      const hasFeeCents = orderColumns.some(col => col.name === "feeCents");
      const hasNetAmountCents = orderColumns.some(col => col.name === "netAmountCents");

      const updateData: any = {
        status: OrderStatus.PAID,
        mpPaymentId: paymentId,
        paymentMethod,
        paidAt,
        manualPaymentReference: manualReference
      };

      // Adicionar campos financeiros apenas se existirem
      if (hasFeeCents) {
        updateData.feeCents = feeCents;
      }
      if (hasNetAmountCents) {
        updateData.netAmountCents = netAmountCents;
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
          paymentMethod
        }
      });
      return updatedOrder;
    });

    await registrationService.generateReceiptsForOrder(orderId);
    await auditService.log({
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
    reason
  }: {
    orderId: string;
    registrationId: string;
    amountCents: number;
    mpRefundId: string;
    reason?: string;
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
      action: "REGISTRATION_REFUNDED",
      entity: "registration",
      entityId: registrationId,
      metadata: { orderId, amountCents }
    });
  }

  async markManualRegistrationsPaid(
    registrationIds: string[],
    options?: { paidAt?: Date; reference?: string }
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
        paymentMethod: group.paymentMethod
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
