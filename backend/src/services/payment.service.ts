import { MercadoPagoConfig, Preference, Payment, PaymentRefund } from "mercadopago";
import type { PreferenceCreateData } from "mercadopago/dist/clients/preference/create/types";

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

const resolveNotificationUrl = () => {
  const base =
    (env.MP_WEBHOOK_PUBLIC_URL && isPublicHttpsUrl(env.MP_WEBHOOK_PUBLIC_URL) && env.MP_WEBHOOK_PUBLIC_URL) ||
    (isPublicHttpsUrl(env.API_URL) && env.API_URL) ||
    null;
  if (!base) return null;
  const normalized = base.trim().replace(/\/$/, "");
  return `${normalized}/webhooks/mercadopago`;
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
    const totalCents = unitPriceCents * registrations.length;
    await prisma.$transaction([
      prisma.order.update({
        where: { id: order.id },
        data: {
          totalCents,
          pricingLotId: lotId ?? null
        }
      }),
      prisma.registration.updateMany({
        where: { orderId: order.id },
        data: { priceCents: unitPriceCents }
      })
    ]);
    order.totalCents = totalCents;
    order.pricingLotId = lotId ?? null;
    registrations.forEach((registration: any) => {
      registration.priceCents = unitPriceCents;
    });
    const items = registrations.map((registration: any) => ({
      id: registration.id,
      title: `${order.event.title} - ${registration.fullName}`,
      quantity: 1,
      unit_price: unitPriceCents / 100
    }));
    return { items, totalCents };
  }

  const items: PreferenceItem[] = [];
  let totalCents = 0;
  for (const registration of registrations) {
    const priceCents =
      registration.priceCents && registration.priceCents > 0
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

class PaymentService {
  private client = new MercadoPagoConfig({
    accessToken: env.MP_ACCESS_TOKEN,
    options: env.MP_INTEGRATOR_ID ? { integratorId: env.MP_INTEGRATOR_ID } : undefined
  });

  private preference = new Preference(this.client);
  private payment = new Payment(this.client);
  private refund = new PaymentRefund(this.client);

  async getPreference(preferenceId: string) {
    try {
      const preference = await this.preference.get({ preferenceId });
      const pointOfInteraction = (preference as any).point_of_interaction;
      return {
        preferenceId: preference.id,
        initPoint: preference.init_point,
        sandboxInitPoint: preference.sandbox_init_point,
        pointOfInteraction,
        pixQrData: pointOfInteraction?.transaction_data,
        status: "PENDING"
      };
    } catch (error: any) {
      logger.error({ preferenceId, error }, "Falha ao recuperar preferencia Mercado Pago");
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
      throw new NotFoundError("Pedido nao encontrado");
    }

    const { totalCents } = await buildPreferenceItemsForOrder(order);

    const notificationUrl = resolveNotificationUrl();

    // Resolver dados do pagador exigidos pelo Mercado Pago para PIX
    const rawCpf = (order.buyerCpf || order.registrations[0]?.cpf || "").toString();
    const sanitizedCpf = rawCpf.replace(/\D/g, "");
    if (!sanitizedCpf || sanitizedCpf.length !== 11) {
      throw new AppError("CPF do pagador ausente ou invalido para gerar PIX", 400);
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
      description: `Pedido ${order.id}`,
      payment_method_id: "pix",
      external_reference: order.id,
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
    const payment = await this.payment.create({ body });

    const pointOfInteraction = (payment as any).point_of_interaction;
    return {
      mpPaymentId: payment.id ? String(payment.id) : undefined,
      pixQrData: pointOfInteraction?.transaction_data
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
      }
    };

    const successUrlIsHttps = backUrls.success.toLowerCase().startsWith("https://");
    if (successUrlIsHttps) {
      preferencePayload.auto_return = "approved";
    } else {
      logger.warn(
        { successUrl: backUrls.success },
        "Auto return desabilitado: URL de sucesso nao utiliza HTTPS"
      );
    }

    let preference;
    try {
      preference = await this.preference.create({
        body: preferencePayload
      });
    } catch (error: any) {
      logger.error({ orderId, error }, "Falha ao criar preferencia Mercado Pago");
      const message =
        error?.message ?? error?.cause?.[0]?.description ?? "Erro ao gerar pagamento com Mercado Pago";
      throw new AppError(message, Number(error?.status) || 502);
    }

    await prisma.order.update({
      where: { id: order.id },
      data: {
        mpPreferenceId: preference.id ?? preference.init_point ?? undefined,
        expiresAt: new Date(Date.now() + env.ORDER_EXPIRATION_MINUTES * 60 * 1000),
        preferenceVersion: nextVersion,
        totalCents
      }
    });

    const pointOfInteraction = (preference as any).point_of_interaction;

    return {
      preferenceId: preference.id,
      initPoint: preference.init_point,
      sandboxInitPoint: preference.sandbox_init_point,
      pointOfInteraction,
      pixQrData: pointOfInteraction?.transaction_data,
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
      }
    };

    const successUrlIsHttps = backUrls.success.toLowerCase().startsWith("https://");
    if (successUrlIsHttps) {
      preferencePayload.auto_return = "approved";
    }

    let preference;
    try {
      preference = await this.preference.create({
        body: preferencePayload
      });
    } catch (error: any) {
      logger.error({ orderIds, error }, "Falha ao criar preferencia em lote Mercado Pago");
      const message =
        error?.message ?? error?.cause?.[0]?.description ?? "Erro ao gerar pagamento em lote com Mercado Pago";
      throw new AppError(message, Number(error?.status) || 502);
    }

    // Atualizar todos os pedidos com a mesma preferência
    const preferenceId = preference.id ?? preference.init_point ?? undefined;
    const expiresAt = new Date(Date.now() + env.ORDER_EXPIRATION_MINUTES * 60 * 1000);

    await prisma.order.updateMany({
      where: { id: { in: orderIds } },
      data: {
        mpPreferenceId: preferenceId,
        expiresAt,
        preferenceVersion: 1
      }
    });

    const pointOfInteraction = (preference as any).point_of_interaction;

    return {
      preferenceId: preference.id,
      initPoint: preference.init_point,
      sandboxInitPoint: preference.sandbox_init_point,
      pointOfInteraction,
      pixQrData: pointOfInteraction?.transaction_data,
      status: "PENDING",
      orderCount: orders.length,
      totalCents,
      eventNames
    };
  }

  async fetchPayment(paymentId: string) {
    return this.payment.get({ id: paymentId });
  }

  async findLatestPaymentByExternalReference(orderId: string) {
    try {
      const searchResult = await this.payment.search({
        options: {
          external_reference: orderId,
          sort: "date_created",
          criteria: "desc",
          limit: 1
        }
      });

      const payment = searchResult.results?.[0];
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
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order?.mpPaymentId) {
      throw new ConflictError("Pedido nao possui pagamento confirmado");
    }

    const paymentMethod = order.paymentMethod as PaymentMethod | null;
    if (
      paymentMethod !== PaymentMethod.PIX_MP ||
      order.mpPaymentId.startsWith("MANUAL-")
    ) {
      throw new ConflictError("Pedido nao foi pago pelo Mercado Pago");
    }

    try {
      const response = await this.refund.create({
        payment_id: order.mpPaymentId,
        body: {
          amount: amountCents / 100
        }
      });

      logger.info({ orderId, registrationId, refundId: response.id }, "Estorno solicitado ao Mercado Pago");

      return response;
    } catch (error: any) {
      logger.error({ orderId, registrationId, error }, "Falha ao solicitar estorno no Mercado Pago");
      const message =
        error?.message ??
        error?.cause?.[0]?.description ??
        "Erro ao solicitar estorno no Mercado Pago";
      throw new AppError(message, Number(error?.status) || 502);
    }
  }
}

export const paymentService = new PaymentService();
