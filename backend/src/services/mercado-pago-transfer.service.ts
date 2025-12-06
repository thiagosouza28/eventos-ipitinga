import { env } from "../config/env";
import { AppError } from "../utils/errors";
import { logger } from "../utils/logger";

type PixTransferInput = {
  amount: number; // em centavos
  pixKey: string;
  pixType?: string | null;
  description?: string | null;
};

class MercadoPagoTransferService {
  private get headers() {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.MP_ACCESS_TOKEN}`
    };
  }

  async createPixTransfer(payload: PixTransferInput) {
    const url = env.MP_TRANSFER_URL;
    const body = {
      amount: payload.amount,
      currency: "BRL",
      description: payload.description ?? "Repasse distrital",
      pix_key: payload.pixKey,
      pix_type: payload.pixType ?? undefined
    };

    let responseBody: any = null;
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify(body)
      });

      const text = await response.text();
      try {
        responseBody = text ? JSON.parse(text) : null;
      } catch {
        responseBody = text ?? null;
      }

      if (!response.ok) {
        const fallback =
          (responseBody as any)?.cause?.[0]?.description ||
          (responseBody as any)?.message ||
          (responseBody as any)?.error;
        const friendly =
          response.status === 404
            ? "Transferencia PIX indisponivel: verifique token, ambiente (prod) e habilitacao de PIX out no Mercado Pago."
            : undefined;
        const message = friendly || fallback || "Falha ao criar transferencia PIX";
        throw new AppError(message, response.status || 502);
      }

      const transferId =
        (responseBody as any)?.id ??
        (responseBody as any)?.transfer_id ??
        (responseBody as any)?.data?.id ??
        null;

      return { id: transferId, raw: responseBody };
    } catch (error: any) {
      logger.error(
        { error, payload: { ...payload, pixKey: "REDACTED" }, responseBody },
        "Erro ao criar transferencia PIX no Mercado Pago"
      );
      if (error instanceof AppError) {
        throw error;
      }
      const message = error?.message ?? "Erro de comunicacao com Mercado Pago";
      throw new AppError(message, 502);
    }
  }
}

export const mercadoPagoService = new MercadoPagoTransferService();
