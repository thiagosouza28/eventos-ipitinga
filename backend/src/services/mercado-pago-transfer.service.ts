import { randomUUID } from "crypto";

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

  private shouldRetryStatus(status: number) {
    return status >= 500 || status === 429;
  }

  private isRetryableError(error: any) {
    const message = String(error?.message ?? "").toLowerCase();
    return (
      error?.name === "AbortError" ||
      error?.code === "ECONNRESET" ||
      error?.code === "ETIMEDOUT" ||
      message.includes("timeout") ||
      message.includes("network")
    );
  }

  private async delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
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
    const idempotencyKey = randomUUID();
    const maxRetries = Math.max(0, env.MP_TRANSFER_MAX_RETRIES);
    const timeoutMs = Math.max(1000, env.MP_TRANSFER_TIMEOUT_MS);
    let attempt = 0;

    try {
      while (attempt <= maxRetries) {
        attempt += 1;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        try {
          const response = await fetch(url, {
            method: "POST",
            headers: {
              ...this.headers,
              "X-Idempotency-Key": idempotencyKey
            },
            body: JSON.stringify(body),
            signal: controller.signal
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
            if (this.shouldRetryStatus(response.status) && attempt <= maxRetries) {
              await this.delay(Math.min(1500, 300 * attempt));
              continue;
            }
            throw new AppError(message, response.status || 502);
          }

          const transferId =
            (responseBody as any)?.id ??
            (responseBody as any)?.transfer_id ??
            (responseBody as any)?.data?.id ??
            null;

          return { id: transferId, raw: responseBody };
        } catch (error: any) {
          if (attempt <= maxRetries && this.isRetryableError(error)) {
            await this.delay(Math.min(1500, 300 * attempt));
            continue;
          }
          throw error;
        } finally {
          clearTimeout(timeoutId);
        }
      }
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
