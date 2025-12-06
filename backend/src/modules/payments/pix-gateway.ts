import type { PixGatewayConfig } from "@/prisma/generated/client";

import { prisma } from "@/lib/prisma";
import { AppError } from "@/utils/errors";
import { logger } from "@/utils/logger";

import { BasePixGateway, type PixGatewayProvider } from "./gateways/BasePixGateway";
import { GerencianetPixGateway } from "./gateways/GerencianetPixGateway";
import { ItauPixGateway } from "./gateways/ItauPixGateway";
import { MercadoPagoPixGateway } from "./gateways/MercadoPagoPixGateway";
import { OpenPixGateway } from "./gateways/OpenPixGateway";
import { SicoobPixGateway } from "./gateways/SicoobPixGateway";

export const normalizePixProvider = (value?: string | null): PixGatewayProvider => {
  const provider = (value ?? "").toString().trim().toLowerCase();
  if (provider === "mercadopago" || provider === "mp") return "mercadopago";
  if (provider === "openpix" || provider === "asaas" || provider === "juno") return "openpix";
  if (provider === "sicoob") return "sicoob";
  if (provider === "gerencianet" || provider === "gn") return "gerencianet";
  if (provider === "itau") return "itau";
  if (provider === "bradesco") return "bradesco";
  if (provider === "santander") return "santander";
  if (provider === "sicredi") return "sicredi";
  if (provider === "inter") return "inter";
  if (provider === "nubank") return "nubank";
  return "mercadopago";
};

const gatewayMap: Record<PixGatewayProvider, new (config: PixGatewayConfig) => BasePixGateway> = {
  mercadopago: MercadoPagoPixGateway,
  openpix: OpenPixGateway,
  sicoob: SicoobPixGateway,
  gerencianet: GerencianetPixGateway,
  itau: ItauPixGateway,
  bradesco: ItauPixGateway,
  santander: ItauPixGateway,
  sicredi: ItauPixGateway,
  inter: ItauPixGateway,
  nubank: ItauPixGateway,
  unknown: MercadoPagoPixGateway
};

const fallbackConfig: PixGatewayConfig = {
  id: 0,
  provider: "mercadopago",
  clientId: null,
  clientSecret: null,
  apiKey: null,
  webhookUrl: null,
  certificatePath: null,
  active: true,
  createdAt: new Date(),
  updatedAt: new Date()
};

export const getActivePixGatewayConfig = async (): Promise<PixGatewayConfig | null> => {
  try {
    const config = await prisma.pixGatewayConfig.findFirst({
      where: { active: true },
      orderBy: { id: "desc" }
    });
    return config ?? null;
  } catch (error) {
    logger.warn({ error }, "Falha ao buscar configuracao PixGatewayConfig");
    return null;
  }
};

export const getActivePixProvider = async (): Promise<PixGatewayProvider | null> => {
  const config = await getActivePixGatewayConfig();
  if (!config) return null;
  return normalizePixProvider(config.provider);
};

export const getActivePixGateway = async (): Promise<BasePixGateway> => {
  const config = await getActivePixGatewayConfig();
  if (!config) {
    logger.warn("Nenhuma configuracao PIX ativa encontrada. Usando fallback Mercado Pago.");
    return new MercadoPagoPixGateway(fallbackConfig);
  }

  const provider = normalizePixProvider(config.provider);
  const GatewayClass = gatewayMap[provider];
  if (!GatewayClass) {
    throw new AppError("PIX provider não configurado.", 400);
  }
  return new GatewayClass(config);
};
