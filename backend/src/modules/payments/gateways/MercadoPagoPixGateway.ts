import { PaymentMethod } from "@/config/payment-methods";
import { paymentService } from "@/services/payment.service";
import { resolveEffectiveExpirationDate } from "@/utils/order-expiration";
import { prisma } from "@/lib/prisma";
import { logger } from "@/utils/logger";

import {
  BasePixGateway,
  type PixChargeResponse,
  type PixChargeStatus,
  type PixGatewayProvider,
  type PixOrderContext
} from "./BasePixGateway";

const mapStatus = (value?: string | null): PixChargeStatus["status"] => {
  const normalized = (value ?? "").toString().toLowerCase();
  if (["approved", "authorized", "paid", "success", "succeeded"].includes(normalized)) return "PAID";
  if (["cancelled", "canceled", "rejected", "charged_back"].includes(normalized)) return "CANCELED";
  if (["expired"].includes(normalized)) return "EXPIRED";
  if (normalized) return "PENDING";
  return "UNKNOWN";
};

export class MercadoPagoPixGateway extends BasePixGateway {
  readonly provider: PixGatewayProvider = "mercadopago";

  async createCharge(order: PixOrderContext): Promise<PixChargeResponse> {
    const pix = await paymentService.createPixPaymentForOrder(order.id);

    // Garantir que a data de expiração calculada pelo gateway esteja persistida
    const expiresAt = resolveEffectiveExpirationDate(
      (order.paymentMethod as PaymentMethod) ?? PaymentMethod.PIX_MP,
      order.createdAt,
      order.expiresAt ?? undefined
    );

    await prisma.order
      .update({
        where: { id: order.id },
        data: {
          mpPaymentId: pix.mpPaymentId ?? undefined,
          expiresAt
        }
      })
      .catch((error) => {
        logger.warn({ orderId: order.id, error }, "Falha ao atualizar expiracao ao gerar PIX via Mercado Pago");
      });

    return {
      chargeId: pix.mpPaymentId ?? order.id,
      payload: pix.pixQrData?.qr_code ?? pix.pixQrData?.qr_code_base64 ?? null,
      qrCode: pix.pixQrData?.qr_code ?? null,
      qrCodeBase64: pix.pixQrData?.qr_code_base64 ?? null,
      raw: pix.pixQrData
    };
  }

  async getChargeStatus(chargeId: string): Promise<PixChargeStatus> {
    const payment = await paymentService.fetchPayment(chargeId);
    const status = mapStatus((payment as any)?.status);
    const paidAt = (payment as any)?.date_approved ?? null;
    return {
      chargeId,
      status,
      paidAt,
      raw: payment
    };
  }
}
