import { MercadoPagoConfig, Preference, Payment, PaymentRefund, MerchantOrder } from "mercadopago";
import type { PreferenceCreateData } from "mercadopago/dist/clients/preference/create/types";
import type { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";

import { env } from "../config/env";
import { prisma } from "../lib/prisma";
import { AppError, ConflictError, NotFoundError } from "../utils/errors";
import { logger } from "../utils/logger";
import { eventService } from "../modules/events/event.service";
import {
  DEFAULT_PENDING_PAYMENT_VALUE_RULE,
  isPendingPaymentValueRule,
  PendingPaymentValueRule
} from "../config/pending-payment-value-rule";
import { PaymentMethod } from "../config/payment-methods";
import {
  resolveEffectiveExpirationDate,
  resolveOrderExpirationDate,
  resolvePixExpirationDate
} from "../utils/order-expiration";
import { buildPixMeta } from "../utils/pix";
import { getPublicApiBaseUrl } from "../utils/public-url";

const isPublicHttpsUrl = (url: string | null | undefined) => {
  if (!url) return false;
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    const host = u.hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1" || host.endsWith(".local")) return false;
    return true;
  } catch {
    return false;
  }
};

const allowInsecureAutoReturn = env.NODE_ENV !== "production" && env.ALLOW_INSECURE_AUTO_RETURN;
const isSuccessUrlHttps = (successUrl: string) => successUrl.toLowerCase().startsWith("https://");
const shouldWarnAutoReturn = (successUrl: string) =>
  !isSuccessUrlHttps(successUrl) && (env.NODE_ENV === "production" || !allowInsecureAutoReturn);

const resolveNotificationUrl = () => {
  if (env.MP_WEBHOOK_PUBLIC_URL && isPublicHttpsUrl(env.MP_WEBHOOK_PUBLIC_URL)) {
    return env.MP_WEBHOOK_PUBLIC_URL.trim().replace(/\/$/, "");
  }
  const apiUrl = getPublicApiBaseUrl();
  if (!isPublicHttpsUrl(apiUrl)) return null;
  return `${apiUrl}/webhooks/mercadopago`;
};

const buildPaymentDescription = (eventTitle?: string | null, participantNames: string[] = []) => {
  const base = (eventTitle ?? "Inscrição").trim();
  const names = participantNames.filter(Boolean).join(", ");
  return names ? `${base} - ${names}` : base;
};

const buildStatementDescriptor = (eventTitle?: string | null, participantNames: string[] = []) => {
  const base = (eventTitle ?? "Inscrição").toString().replace(/\s+/g, " ").trim();
  const firstName = participantNames.find(Boolean)?.split(/\s+/)?.[0] ?? "";
  const raw = `${base} ${firstName}`.trim().toUpperCase();
  return raw.slice(0, 22);
};

const resolveCurrentLotInfo = async (eventId: string, fallbackPriceCents?: number | null) => {
  const lot = await eventService.findActiveLot(eventId);
  if (lot && typeof lot.priceCents === "number") {
    return {
      priceCents: Math.max(lot.priceCents, 0),
      lotId: lot.id
    };
  }
  return {
    priceCents: Math.max(fallbackPriceCents ?? 0, 0),
    lotId: null
  };
};

export const resolveCurrentLotPriceCents = async (eventId: string, fallbackPriceCents?: number | null) =>
  (await resolveCurrentLotInfo(eventId, fallbackPriceCents)).priceCents;

type PreferenceItem = {
  id: string;
  title: string;
  quantity: number;
  unit_price: number;
};

type PricingResult = {
  items: PreferenceItem[];
  totalCents: number;
};

const resolvePendingRuleForOrder = (order: any): PendingPaymentValueRule => {
  const ruleValue = order.event?.pendingPaymentValueRule;
  if (isPendingPaymentValueRule(ruleValue)) {
    return ruleValue;
  }
  return DEFAULT_PENDING_PAYMENT_VALUE_RULE;
};

const buildPreferenceItemsForOrder = async (order: any): Promise<PricingResult> => {
  const rule = resolvePendingRuleForOrder(order);
  const fallbackPriceCents = order.event?.priceCents ?? 0;
  const registrations = order.registrations ?? [];

  if (rule === "UPDATE_TO_ACTIVE_LOT") {
    const { priceCents: unitPriceCents, lotId } = await resolveCurrentLotInfo(order.eventId, fallbackPriceCents);
    const minAgeLimit = typeof order.event?.minAgeYears === "number" ? order.event.minAgeYears : null;
    const registrationsWithPricing = registrations.map((registration: any) => {
      const ageYears = typeof registration.ageYears === "number" ? registration.ageYears : null;
      const priceCents =
        minAgeLimit !== null && ageYears !== null && ageYears <= minAgeLimit ? 0 : unitPriceCents;
      return { ...registration, priceCents };
    });
    const totalCents = registrationsWithPricing.reduce((acc: number, reg: any) => acc + (reg.priceCents ?? 0), 0);
    const updates: Prisma.PrismaPromise<any>[] = [
      prisma.order.update({
        where: { id: order.id },
        data: {
          totalCents,
          pricingLotId: lotId ?? null
        }
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
          data: { priceCents: unitPriceCents }
        })
      );
    } else {
      updates.push(
        prisma.registration.updateMany({
          where: { orderId: order.id },
          data: { priceCents: unitPriceCents }
        })
      );
    }
    await prisma.$transaction(updates);
    order.totalCents = totalCents;
    order.pricingLotId = lotId ?? null;
    registrationsWithPricing.forEach((registration: any, index: number) => {
      registrations[index].priceCents = registration.priceCents;
    });
    const items = registrationsWithPricing.map((registration: any) => ({
      id: registration.id,
      title: `${order.event.title} - ${registration.fullName}`,
      quantity: 1,
      unit_price: (registration.priceCents ?? 0) / 100
    }));
    return { items, totalCents };
  }

  const items: PreferenceItem[] = [];
  let totalCents = 0;
  for (const registration of registrations) {
    const priceCents =
      typeof registration.priceCents === "number"
        ? registration.priceCents
        : fallbackPriceCents;
    items.push({
      id: registration.id,
      title: `${order.event.title} - ${registration.fullName}`,
      quantity: 1,
      unit_price: priceCents / 100
    });
    totalCents += priceCents;
  }
  return { items, totalCents };
};

export const extractPreferenceVersion = (metadata: any): number | null => {
  if (!metadata) return null;
  const keys = [
    "preferenceVersion",
    "preference_version",
    "preference-version",
    "preferenceversion"
  ];
  for (const key of keys) {
    if (metadata[key] == null) continue;
    const value = Number(metadata[key]);
    if (!Number.isNaN(value)) {
      return value;
    }
  }
  return null;
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getMercadoPagoErrorMessage = (error: any) => {
  const cause = Array.isArray(error?.cause) ? error.cause[0] : undefined;
  return String(cause?.description ?? cause?.code ?? error?.message ?? error?.error ?? "").trim();
};

const isRefundTemporarilyUnavailable = (error: any) => {
  const status = Number(error?.status ?? error?.response?.status);
  const message = getMercadoPagoErrorMessage(error).toLowerCase();
  return (
    status === 425 ||
    message.includes("invalid status to refund") ||
    message.includes("not yet enabled for refund") ||
    message.includes("movement operations pending")
  );
};

const translateRefundError = (error: any) => {
  const rawMessage = getMercadoPagoErrorMessage(error);
  const message = rawMessage.toLowerCase();

  if (isRefundTemporarilyUnavailable(error)) {
    return "O Mercado Pago ainda não liberou este pagamento para estorno. Aguarde alguns minutos e tente novamente.";
  }
  if (message.includes("insufficient") || message.includes("not enough balance")) {
    return "Saldo insuficiente na conta Mercado Pago para realizar o estorno.";
  }
  if (message.includes("refund period") || message.includes("too old")) {
    return "O prazo permitido pelo Mercado Pago para estornar este pagamento foi excedido.";
  }
  if (message.includes("amount") || message.includes("exceed")) {
    return "O valor solicitado não está disponível para estorno no Mercado Pago.";
  }
  if (message.includes("unauthorized") || message.includes("not authorized")) {
    return "A credencial configurada não tem permissão para estornar este pagamento no Mercado Pago.";
  }

  return rawMessage || "Erro ao solicitar estorno no Mercado Pago";
};

const isRetryableError = (error: any) => {
  const status = Number(error?.status ?? error?.response?.status);
  if (!Number.isNaN(status) && status >= 500) return true;
  const message = String(error?.message ?? "").toLowerCase();
  return message.includes("timeout") || message.includes("network");
};

class PaymentService {
  private client = new MercadoPagoConfig({
    accessToken: env.MP_ACCESS_TOKEN,
    options: env.MP_INTEGRATOR_ID ? { integratorId: env.MP_INTEGRATOR_ID } : undefined
  });

  private preference = new Preference(this.client);
  private payment = new Payment(this.client);
  private refund = new PaymentRefund(this.client);
  private merchantOrder = new MerchantOrder(this.client);

  private async withRetry<T>(operation: () => Promise<T>) {
    const retries = Math.max(0, env.MP_READ_MAX_RETRIES);
    const baseDelay = Math.max(0, env.MP_READ_RETRY_DELAY_MS);
    let attempt = 0;
    while (true) {
      try {
        return await operation();
      } catch (error) {
        attempt += 1;
        if (attempt > retries || !isRetryableError(error)) {
          throw error;
        }
        await delay(baseDelay * Math.max(1, attempt));
      }
    }
  }

  async getPreference(preferenceId: string) {
    try {
      const preference = await this.withRetry(() => this.preference.get({ preferenceId }));
      const pointOfInteraction = (preference as any).point_of_interaction;
      const pixMeta = buildPixMeta(pointOfInteraction?.transaction_data);
      return {
        preferenceId: preference.id,
        initPoint: preference.init_point,
        sandboxInitPoint: preference.sandbox_init_point,
        pointOfInteraction,
        pixQrData: pointOfInteraction?.transaction_data,
        ...pixMeta,
        status: "PENDING"
      };
    } catch (error: any) {
      logger.error({ preferenceId, error }, "Falha ao recuperar preferência Mercado Pago");
      const message =
        error?.message ?? error?.cause?.[0]?.description ?? "Erro ao recuperar preferência existente";
      throw new AppError(message, Number(error?.status) || 502);
    }
  }

  // Fallback para gerar um pagamento PIX e obter o QR code diretamente
  async createPixPaymentForOrder(orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { registrations: true, event: true }
    });
    if (!order) {
      throw new NotFoundError("Pedido não encontrado");
    }

    const { totalCents } = await buildPreferenceItemsForOrder(order);
    // Se o pedido foi criado há muito tempo, a data de expiração baseada no createdAt pode ficar no passado.
    // Gera sempre a expiração do PIX a partir de agora para garantir validade aceita pelo Mercado Pago.
    const now = new Date();
    const pixExpirationDate = resolvePixExpirationDate(now);
    const participantNames = order.registrations.map((r) => r.fullName).filter(Boolean);
    const description = buildPaymentDescription(order.event?.title, participantNames);
    const statementDescriptor = buildStatementDescriptor(order.event?.title, participantNames);

    const notificationUrl = resolveNotificationUrl();

    // Resolver dados do pagador exigidos pelo Mercado Pago para PIX
    const rawCpf = (order.buyerCpf || order.registrations[0]?.cpf || "").toString();
    const sanitizedCpf = rawCpf.replace(/\D/g, "");
    if (!sanitizedCpf || sanitizedCpf.length !== 11) {
      throw new AppError("CPF do pagador ausente ou inválido para gerar PIX", 400);
    }

    const buyerName = (order as any).buyerName as string | null | undefined;
    const buyerEmail = (order as any).buyerEmail as string | null | undefined;
    const buyerRawName = (buyerName ?? "Participante").trim();
    const [firstName, ...restNames] = (buyerRawName.length ? buyerRawName : "Participante").split(/\s+/);
    const lastName = restNames.join(" ") || "CATRE";
    const emailFallback = buyerEmail && /.+@.+\..+/.test(buyerEmail)
      ? buyerEmail
      : `${sanitizedCpf}@example.com`;

    // Criar pagamento PIX associado ao orderId (via external_reference)
    const body: any = {
      transaction_amount: totalCents / 100,
      description,
      statement_descriptor: statementDescriptor,
      payment_method_id: "pix",
      external_reference: order.id,
      date_of_expiration: pixExpirationDate.toISOString(),
      payer: {
        email: emailFallback,
        first_name: firstName || "Participante",
        last_name: lastName,
        identification: {
          type: "CPF",
          number: sanitizedCpf
        }
      }
    };
    if (notificationUrl) {
      body.notification_url = notificationUrl;
    }
    if (order.registrations?.length) {
      body.additional_info = {
        items: order.registrations.map((registration: any) => ({
          id: registration.id,
          title: `${order.event?.title ?? "Inscrição"} - ${registration.fullName}`,
          description: `${order.event?.title ?? "Inscrição"} - ${registration.fullName}`,
          quantity: 1,
          unit_price: (registration.priceCents ?? order.totalCents / Math.max(order.registrations.length, 1)) / 100
        }))
      };
    }

    const payment = await this.payment.create({
      body,
      requestOptions: {
        idempotencyKey: `pix-${order.id}-${order.preferenceVersion ?? 0}`
      }
    });

    const desiredExpiresAt = resolveEffectiveExpirationDate(
      order.paymentMethod as PaymentMethod,
      now,
      order.expiresAt
    );
    if (
      order.status === "PENDING" &&
      (!order.expiresAt || order.expiresAt.getTime() < desiredExpiresAt.getTime())
    ) {
      await prisma.order
        .update({
          where: { id: order.id },
          data: { expiresAt: desiredExpiresAt }
        })
        .catch((error) => {
          logger.warn({ orderId, error }, "Falha ao atualizar expiracao do pedido para PIX");
        });
    }

    const pointOfInteraction = (payment as any).point_of_interaction;
    const pixMeta = buildPixMeta(pointOfInteraction?.transaction_data);

    logger.info(
      {
        orderId,
        paymentId: payment.id ? String(payment.id) : undefined,
        transactionAmount: totalCents / 100,
        expiresAt: pixExpirationDate.toISOString(),
        ...pixMeta
      },
      "PIX_PAYMENT_CREATED"
    );

    return {
      mpPaymentId: payment.id ? String(payment.id) : undefined,
      pixQrData: pointOfInteraction?.transaction_data,
      ...pixMeta
    };
  }

  async createPreference(orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { registrations: true, event: true }
    });
    if (!order) {
      throw new NotFoundError("Pedido não encontrado");
    }

    const nextVersion = (order.preferenceVersion ?? 0) + 1;

    const { items, totalCents } = await buildPreferenceItemsForOrder(order);
    const participantNames = order.registrations.map((r) => r.fullName).filter(Boolean);
    const description = buildPaymentDescription(order.event?.title, participantNames);
    const statementDescriptor = buildStatementDescriptor(order.event?.title, participantNames);

    const appUrl = env.APP_URL?.trim().replace(/\/$/, "");
    if (!appUrl) {
      throw new AppError("APP_URL não configurado. Defina a URL pública do frontend.", 500);
    }

    const apiUrl = env.API_URL?.trim().replace(/\/$/, "");
    if (!apiUrl) {
      throw new AppError("API_URL não configurado. Defina a URL pública da API.", 500);
    }

    const backUrls = {
      success: `${appUrl}/payments/success?orderId=${order.id}`,
      failure: `${appUrl}/payments/failure?orderId=${order.id}`,
      pending: `${appUrl}/payments/pending?orderId=${order.id}`
    };

    if (!backUrls.success) {
      throw new AppError("URL de sucesso para retorno automático não configurada.", 500);
    }

    const notificationUrl = resolveNotificationUrl();

    // Resolver dados do pagador para a Preferncia (Checkout Pro)
    const prefCpfRaw = (order.buyerCpf || order.registrations[0]?.cpf || "").toString();
    const prefCpf = prefCpfRaw.replace(/\D/g, "");
    const prefBuyerName = (order as any).buyerName as string | null | undefined;
    const prefBuyerEmail = (order as any).buyerEmail as string | null | undefined;
    const prefRawName = (prefBuyerName ?? "Participante").trim();
    const [prefFirstName, ...prefRest] = (prefRawName.length ? prefRawName : "Participante").split(/\s+/);
    const prefLastName = prefRest.join(" ") || "CATRE";
    const prefEmail = prefBuyerEmail && /.+@.+\..+/.test(prefBuyerEmail)
      ? prefBuyerEmail
      : `${prefCpf}@example.com`;

    const preferencePayload: PreferenceCreateData["body"] = {
      external_reference: order.id,
      items,
      payer: {
        email: prefEmail,
        name: prefFirstName || "Participante",
        surname: prefLastName,
        identification: {
          type: "CPF",
          number: prefCpf
        }
      },
      back_urls: backUrls,
      payment_methods: {
        excluded_payment_types: [],
        installments: 6
      },
      metadata: {
        orderId: order.id,
        registrationIds: order.registrations.map((r) => r.id),
        buyerCpf: order.buyerCpf,
        lotId: order.pricingLotId,
        preferenceVersion: nextVersion
      },
      ...(notificationUrl ? { notification_url: notificationUrl } : {}),
      ...(statementDescriptor ? { statement_descriptor: statementDescriptor } : {})
    };
    (preferencePayload as any).description = description;

    const successUrlIsHttps = isSuccessUrlHttps(backUrls.success);
    if (successUrlIsHttps) {
      preferencePayload.auto_return = "approved";
    } else if (shouldWarnAutoReturn(backUrls.success)) {
      logger.warn(
        { successUrl: backUrls.success },
        "Auto return desabilitado: URL de sucesso não utiliza HTTPS"
      );
    }

    let preference;
    try {
      preference = await this.preference.create({
        body: preferencePayload
      });
    } catch (error: any) {
      logger.error({ orderId, error }, "Falha ao criar preferência Mercado Pago");
      const message =
        error?.message ?? error?.cause?.[0]?.description ?? "Erro ao gerar pagamento com Mercado Pago";
      throw new AppError(message, Number(error?.status) || 502);
    }

    await prisma.order.update({
      where: { id: order.id },
      data: {
        mpPreferenceId: preference.id ?? preference.init_point ?? undefined,
        expiresAt: resolveEffectiveExpirationDate(
          order.paymentMethod as PaymentMethod,
          order.createdAt,
          order.expiresAt
        ),
        preferenceVersion: nextVersion,
        totalCents
      }
    });

    const pointOfInteraction = (preference as any).point_of_interaction;
    const pixMeta = buildPixMeta(pointOfInteraction?.transaction_data);

    logger.info(
      {
        orderId,
        preferenceId: preference.id,
        transactionAmount: totalCents / 100,
        expiresAt: resolveEffectiveExpirationDate(
          order.paymentMethod as PaymentMethod,
          order.createdAt,
          order.expiresAt
        ).toISOString(),
        ...pixMeta
      },
      "MP_PREFERENCE_CREATED"
    );

    return {
      preferenceId: preference.id,
      initPoint: preference.init_point,
      sandboxInitPoint: preference.sandbox_init_point,
      pointOfInteraction,
      pixQrData: pointOfInteraction?.transaction_data,
      ...pixMeta,
      status: "PENDING"
    };
  }

  async createBulkPreference(orderIds: string[]) {
    if (!orderIds || orderIds.length === 0) {
      throw new AppError("Nenhum pedido informado", 400);
    }

    // Buscar todos os pedidos
    const orders = await prisma.order.findMany({
      where: {
        id: { in: orderIds },
        status: "PENDING"
      },
      include: {
        registrations: true,
        event: true
      }
    });

    if (orders.length === 0) {
      throw new NotFoundError("Nenhum pedido pendente encontrado");
    }

    if (orders.length !== orderIds.length) {
      throw new AppError("Alguns pedidos não foram encontrados ou não estão pendentes", 400);
    }

    // Verificar se todos os pedidos pertencem ao mesmo CPF
    const buyerCpfs = [...new Set(orders.map((o) => o.buyerCpf))];
    if (buyerCpfs.length > 1) {
      throw new AppError("Todos os pedidos devem pertencer ao mesmo comprador", 400);
    }

    const buyerCpf = buyerCpfs[0];

    const items: PreferenceItem[] = [];
    const registrationIds: string[] = [];
    const eventNames: string[] = [];
    let totalCents = 0;

    // Criar items combinando todos os registros de todos os pedidos
    for (const order of orders) {
      const eventName = order.event.title;
      if (!eventNames.includes(eventName)) {
        eventNames.push(eventName);
      }

      const { items: orderItems, totalCents: orderTotal } = await buildPreferenceItemsForOrder(order);
      items.push(...orderItems);
      totalCents += orderTotal;
      for (const registration of order.registrations) {
        registrationIds.push(registration.id);
      }
    }

    const appUrl = env.APP_URL?.trim().replace(/\/$/, "");
    if (!appUrl) {
      throw new AppError("APP_URL não configurado. Defina a URL pública do frontend.", 500);
    }

    const apiUrl = env.API_URL?.trim().replace(/\/$/, "");
    if (!apiUrl) {
      throw new AppError("API_URL não configurado. Defina a URL pública da API.", 500);
    }

    // Usar formato especial para referência em lote
    const externalReference = `BULK:${orderIds.join(",")}`;

    const backUrls = {
      success: `${appUrl}/pendencias?cpf=${buyerCpf}`,
      failure: `${appUrl}/pendencias?cpf=${buyerCpf}`,
      pending: `${appUrl}/pendencias?cpf=${buyerCpf}`
    };

    const bulkCpf = (buyerCpf || orders[0]?.buyerCpf || "").toString().replace(/\D/g, "");
    const bulkEmail = `${bulkCpf}@example.com`;
    const participantNames = orders.flatMap((o) => o.registrations.map((r) => r.fullName)).filter(Boolean);
    const description = buildPaymentDescription(eventNames.join(" / ") || orders[0]?.event?.title, participantNames);
    const statementDescriptor = buildStatementDescriptor(eventNames[0] ?? orders[0]?.event?.title, participantNames);
    const notificationUrl = resolveNotificationUrl();
    const preferencePayload: PreferenceCreateData["body"] = {
      external_reference: externalReference,
      items,
      payer: {
        email: bulkEmail,
        name: "Participante",
        surname: "CATRE",
        identification: {
          type: "CPF",
          number: bulkCpf
        }
      },
      back_urls: backUrls,
      payment_methods: {
        excluded_payment_types: [],
        installments: 6
      },
      metadata: {
        orderIds: orderIds.join(","),
        registrationIds: registrationIds.join(","),
        buyerCpf,
        isBulk: true,
        preferenceVersion: 1
      },
      ...(notificationUrl ? { notification_url: notificationUrl } : {}),
      ...(statementDescriptor ? { statement_descriptor: statementDescriptor } : {})
    };
    (preferencePayload as any).description = description;

    const successUrlIsHttps = isSuccessUrlHttps(backUrls.success);
    if (successUrlIsHttps) {
      preferencePayload.auto_return = "approved";
    } else if (shouldWarnAutoReturn(backUrls.success)) {
      logger.warn(
        { successUrl: backUrls.success },
        "Auto return desabilitado: URL de sucesso não utiliza HTTPS"
      );
    }

    let preference;
    try {
      preference = await this.preference.create({
        body: preferencePayload
      });
    } catch (error: any) {
      logger.error({ orderIds, error }, "Falha ao criar preferência em lote Mercado Pago");
      const message =
        error?.message ?? error?.cause?.[0]?.description ?? "Erro ao gerar pagamento em lote com Mercado Pago";
      throw new AppError(message, Number(error?.status) || 502);
    }

    // Atualizar todos os pedidos com a mesma preferência
    const preferenceId = preference.id ?? preference.init_point ?? undefined;
    const paymentMethod = (orders[0]?.paymentMethod as PaymentMethod) ?? PaymentMethod.PIX_MP;
    const referenceOrder = orders[0];
    const expiresAt = referenceOrder
      ? resolveEffectiveExpirationDate(paymentMethod, referenceOrder.createdAt, referenceOrder.expiresAt)
      : resolveOrderExpirationDate(paymentMethod);

    await prisma.order.updateMany({
      where: { id: { in: orderIds } },
      data: {
        mpPreferenceId: preferenceId,
        expiresAt,
        preferenceVersion: 1
      }
    });

    const pointOfInteraction = (preference as any).point_of_interaction;
    const pixMeta = buildPixMeta(pointOfInteraction?.transaction_data);

    logger.info(
      {
        preferenceId: preference.id,
        orderCount: orders.length,
        transactionAmount: totalCents / 100,
        expiresAt: expiresAt?.toISOString?.() ?? null,
        ...pixMeta
      },
      "MP_BULK_PREFERENCE_CREATED"
    );

    return {
      preferenceId: preference.id,
      initPoint: preference.init_point,
      sandboxInitPoint: preference.sandbox_init_point,
      pointOfInteraction,
      pixQrData: pointOfInteraction?.transaction_data,
      ...pixMeta,
      status: "PENDING",
      orderCount: orders.length,
      totalCents,
      eventNames
    };
  }

  async fetchPayment(paymentId: string) {
    return this.withRetry(() => this.payment.get({ id: paymentId }));
  }

  async fetchMerchantOrder(merchantOrderId: string) {
    try {
      return await this.withRetry(() => this.merchantOrder.get({ merchantOrderId }));
    } catch (error: any) {
      logger.error({ merchantOrderId, error }, "Falha ao recuperar merchant order no Mercado Pago");
      const message =
        error?.message ??
        error?.cause?.[0]?.description ??
        "Erro ao recuperar pedido Mercado Pago";
      throw new AppError(message, Number(error?.status) || 502);
    }
  }

  async findLatestPaymentByExternalReference(orderId: string) {
    try {
      const searchResult = await this.withRetry(() =>
        this.payment.search({
          options: {
            external_reference: orderId,
            sort: "date_created",
            criteria: "desc",
            limit: 20
          }
        })
      );

      const results = searchResult.results ?? [];
      // Não deixe uma tentativa mais recente rejeitada/expirada ocultar um
      // pagamento aprovado para a mesma referência externa.
      const payment = results.find((candidate) => candidate.status === "approved") ?? results[0];
      if (!payment) return null;

      return {
        id: payment.id ? String(payment.id) : undefined,
        status: payment.status ?? undefined,
        statusDetail: payment.status_detail ?? undefined,
        dateApproved: payment.date_approved ?? undefined
      };
    } catch (error) {
      logger.error({ orderId, error }, "Falha ao buscar pagamento por referencia");
      return null;
    }
  }

  async refundRegistration(orderId: string, registrationId: string, amountCents: number) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        registrations: {
          where: { id: registrationId },
          include: { refunds: true }
        }
      }
    });
    if (!order?.mpPaymentId) {
      throw new ConflictError("Pedido não possui pagamento confirmado");
    }

    const registration = order.registrations[0];
    if (!registration) {
      throw new NotFoundError("Inscrição não pertence ao pedido informado");
    }
    if (registration.status === "REFUNDED" || registration.refunds.length > 0) {
      throw new ConflictError("Esta inscrição já foi estornada");
    }
    if (!Number.isInteger(amountCents) || amountCents <= 0) {
      throw new ConflictError("Valor de estorno inválido");
    }
    if (amountCents !== registration.priceCents) {
      throw new ConflictError("O estorno deve corresponder ao valor integral da inscrição");
    }

    const paymentMethod = order.paymentMethod as PaymentMethod | null;
    if (
      paymentMethod !== PaymentMethod.PIX_MP ||
      order.mpPaymentId.startsWith("MANUAL-")
    ) {
      throw new ConflictError("Pedido não foi pago pelo Mercado Pago");
    }

    const payment = await this.fetchPayment(order.mpPaymentId).catch((error: any) => {
      logger.error({ orderId, registrationId, error }, "Falha ao validar pagamento antes do estorno");
      throw new AppError("Não foi possível validar o pagamento no Mercado Pago. Tente novamente.", 502);
    });
    const paymentStatus = String(payment.status ?? "").toLowerCase();
    if (paymentStatus !== "approved") {
      throw new ConflictError(
        `O pagamento não pode ser estornado no status atual do Mercado Pago (${paymentStatus || "desconhecido"})`
      );
    }
    if (payment.external_reference && payment.external_reference !== order.externalReference) {
      throw new ConflictError("O pagamento do Mercado Pago não corresponde a este pedido");
    }

    const paidCents = Math.round(Number(payment.transaction_amount ?? 0) * 100);
    const providerRefundedCents = Math.round(Number(payment.transaction_amount_refunded ?? 0) * 100);
    const remainingCents = Math.max(0, paidCents - providerRefundedCents);
    if (amountCents > remainingCents) {
      throw new ConflictError(
        remainingCents > 0
          ? `O Mercado Pago permite estornar no máximo R$ ${(remainingCents / 100).toFixed(2).replace(".", ",")}`
          : "Este pagamento já foi estornado integralmente no Mercado Pago"
      );
    }

    const baseIdempotencyKey = `registration-refund-${registrationId}`;
    let idempotencyKey = baseIdempotencyKey;
    let lastError: any;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const response = await this.refund.create({
          payment_id: order.mpPaymentId,
          body: { amount: amountCents / 100 },
          requestOptions: { idempotencyKey }
        });

        if (!response.id) {
          throw new AppError("Mercado Pago não confirmou o identificador do estorno", 502);
        }

        logger.info(
          { orderId, registrationId, refundId: response.id, amountCents },
          "Estorno confirmado pelo Mercado Pago"
        );

        return response;
      } catch (error: any) {
        lastError = error;
        const shouldRetry = attempt < 3 && (isRefundTemporarilyUnavailable(error) || isRetryableError(error));
        if (!shouldRetry) break;

        const providerStatus = Number(error?.status ?? error?.response?.status);
        const definitiveProviderRejection = providerStatus >= 400 && providerStatus < 500;
        if (definitiveProviderRejection && isRefundTemporarilyUnavailable(error)) {
          // O Mercado Pago pode memorizar respostas 4xx pela chave de idempotencia.
          // Como a rejeicao 4xx confirma que nenhum valor foi devolvido, a proxima
          // tentativa precisa de uma chave nova. Falhas ambiguas (rede/5xx) mantem
          // a mesma chave para nunca correr o risco de duplicar o estorno.
          const retrySuffix = randomUUID().replace(/-/g, "").slice(0, 12);
          idempotencyKey = `${baseIdempotencyKey}-${retrySuffix}`;
        }
        await delay(1500 * attempt);
      }
    }

    logger.error(
      { orderId, registrationId, error: lastError },
      "Falha ao solicitar estorno no Mercado Pago"
    );
    if (lastError instanceof AppError) {
      throw lastError;
    }
    const providerStatus = Number(lastError?.status ?? lastError?.response?.status);
    const statusCode = providerStatus >= 500 ? 502 : 409;
    throw new AppError(translateRefundError(lastError), statusCode);
  }
}

export const paymentService = new PaymentService();
