import { prisma } from "@/lib/prisma";
import { AppError } from "@/utils/errors";
import { logger } from "@/utils/logger";

type PixConfigInput = {
  id?: number | null;
  provider: string;
  clientId?: string | null;
  clientSecret?: string | null;
  apiKey?: string | null;
  webhookUrl?: string | null;
  certificatePath?: string | null;
  active?: boolean | null;
};

const normalize = (value: string | null | undefined) => {
  if (value == null) return null;
  const trimmed = value.toString().trim();
  return trimmed.length ? trimmed : null;
};

export class PixConfigService {
  async getActive() {
    try {
      return await prisma.pixGatewayConfig.findFirst({
        where: { active: true },
        orderBy: { id: "desc" }
      });
    } catch (error: any) {
      if (error?.code === "P2021") {
        // Tabela ainda não migrada
        return null;
      }
      throw error;
    }
  }

  async getLatest() {
    try {
      return await prisma.pixGatewayConfig.findFirst({
        orderBy: { id: "desc" }
      });
    } catch (error: any) {
      if (error?.code === "P2021") {
        return null;
      }
      throw error;
    }
  }

  async upsert(data: PixConfigInput) {
    const provider = normalize(data.provider);
    if (!provider) {
      throw new AppError("Provedor PIX é obrigatório.", 400);
    }

    const payload = {
      provider: provider.toLowerCase(),
      clientId: normalize(data.clientId),
      clientSecret: normalize(data.clientSecret),
      apiKey: normalize(data.apiKey),
      webhookUrl: normalize(data.webhookUrl),
      certificatePath: normalize(data.certificatePath),
      active: data.active ?? true
    };

    return prisma.$transaction(async (tx) => {
      if (payload.active) {
        await tx.pixGatewayConfig.updateMany({
          data: { active: false }
        });
      }

      if (data.id) {
        const existing = await tx.pixGatewayConfig.findUnique({ where: { id: data.id } });
        if (!existing) {
          throw new AppError("Configuração PIX não encontrada.", 404);
        }
        return tx.pixGatewayConfig.update({
          where: { id: data.id },
          data: payload
        });
      }

      try {
        return await tx.pixGatewayConfig.create({ data: payload });
      } catch (error) {
        if ((error as any)?.code === "P2021") {
          throw new AppError("Tabela PixGatewayConfig ausente. Rode as migrações do banco.", 503);
        }
        logger.error({ error }, "Falha ao salvar configuração PIX");
        throw new AppError("Não foi possível salvar a configuração PIX.", 500);
      }
    });
  }
}

export const pixConfigService = new PixConfigService();
