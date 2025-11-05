import { MercadoPagoConfig, Preference, Payment, PaymentRefund } from "mercadopago";
import type { PreferenceCreateData } from "mercadopago/dist/clients/preference/create/types";

import { env } from "../config/env";
import { prisma } from "../lib/prisma";
import { AppError, ConflictError, NotFoundError } from "../utils/errors";
import { logger } from "../utils/logger";

type PreferenceItem = {
  id: string;
  title: string;
  quantity: number;
  unit_price: number;
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

  async createPreference(orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { registrations: true, event: true }
    });
    if (!order) {
      throw new NotFoundError("Pedido não encontrado");
    }

    const nextVersion = (order.preferenceVersion ?? 0) + 1;

    const items: PreferenceItem[] = order.registrations.map((registration) => {
      const priceCents =
        registration.priceCents && registration.priceCents > 0
          ? registration.priceCents
          : order.event.priceCents;
      return {
        id: registration.id,
        title: `${order.event.title} - ${registration.fullName}`,
        quantity: 1,
        unit_price: priceCents / 100
      };
    });
    const totalCents = order.registrations.reduce((acc, registration) => {
      const priceCents =
        registration.priceCents && registration.priceCents > 0
          ? registration.priceCents
          : order.event.priceCents;
      return acc + priceCents;
    }, 0);

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

    const preferencePayload: PreferenceCreateData["body"] = {
      external_reference: order.id,
      items,
      payer: {
        identification: {
          type: "CPF",
          number: order.buyerCpf
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
      notification_url: `${apiUrl}/webhooks/mercadopago`
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

    // Criar items combinando todos os registros de todos os pedidos
    const items: PreferenceItem[] = [];
    let totalCents = 0;
    const registrationIds: string[] = [];
    const eventNames: string[] = [];

    for (const order of orders) {
      const eventName = order.event.title;
      if (!eventNames.includes(eventName)) {
        eventNames.push(eventName);
      }

      for (const registration of order.registrations) {
        const priceCents =
          registration.priceCents && registration.priceCents > 0
            ? registration.priceCents
            : order.event.priceCents;
        
        items.push({
          id: registration.id,
          title: `${eventName} - ${registration.fullName}`,
          quantity: 1,
          unit_price: priceCents / 100
        });
        
        totalCents += priceCents;
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

    const preferencePayload: PreferenceCreateData["body"] = {
      external_reference: externalReference,
      items,
      payer: {
        identification: {
          type: "CPF",
          number: buyerCpf
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
      notification_url: `${apiUrl}/webhooks/mercadopago`
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

    const response = await this.refund.create({
      payment_id: order.mpPaymentId,
      body: {
        amount: amountCents / 100
      }
    });

    logger.info({ orderId, registrationId, refundId: response.id }, "Estorno solicitado ao Mercado Pago");

    return response;
  }
}

export const paymentService = new PaymentService();
