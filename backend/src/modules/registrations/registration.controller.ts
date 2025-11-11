import { Request, Response } from "express";
import { z } from "zod";

import { orderService } from "../orders/order.service";
import { paymentService } from "../../services/payment.service";
import { registrationService } from "./registration.service";
import { AppError, NotFoundError } from "../../utils/errors";
import { Gender } from "../../config/gender";
import { isValidCpf } from "../../utils/cpf";
import { PaymentMethod } from "../../config/payment-methods";
import { logger } from "../../utils/logger";

const cuidOrUuid = z.string().uuid().or(z.string().cuid());
// Aceitar IDs vazios como undefined e ignorar valores inválidos em filtros
const optionalId = z.preprocess((value) => {
  if (typeof value !== "string") return undefined;
  const s = value.trim();
  if (s.length === 0) return undefined;
  // Validar contra UUID ou CUID; se não for nenhum, ignorar (undefined) ao invés de lançar erro
  const isUuid = z.string().uuid().safeParse(s).success;
  const isCuid = z.string().cuid().safeParse(s).success;
  return isUuid || isCuid ? s : undefined;
}, z.string().optional());

const optionalStatus = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.enum(["DRAFT", "PENDING_PAYMENT", "PAID", "CANCELED", "REFUNDED", "CHECKED_IN"]).optional()
);

const listSchema = z.object({
  eventId: optionalId,
  districtId: optionalId,
  churchId: optionalId,
  status: optionalStatus
});

const reportSchema = listSchema.extend({
  groupBy: z.enum(["event", "church"])
});
const reportDownloadSchema = reportSchema.extend({
  template: z.enum(["standard", "event"]).optional().default("standard"),
  layout: z.enum(["single", "two"]).optional()
});

const onlyDigits = (v: unknown) => (typeof v === "string" ? v.replace(/\D/g, "") : v);

const updateSchema = z.object({
  districtId: z.string().uuid().optional(),
  churchId: z.string().uuid().optional(),
  fullName: z.string().min(3).optional(),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  cpf: z
    .preprocess(onlyDigits, z.string().length(11))
    .refine((v) => isValidCpf(String(v)), { message: "CPF invalido" })
    .optional(),
  gender: z.nativeEnum(Gender).optional(),
  photoUrl: z.string().min(20).optional().or(z.literal(null))
});

const refundSchema = z.object({
  amountCents: z.number().int().positive().optional(),
  reason: z.string().optional()
});

const bulkMarkPaidSchema = z.object({
  registrationIds: z.array(cuidOrUuid).min(1),
  paidAt: z.string().datetime().optional(),
  reference: z.string().min(3).optional()
});

export const listRegistrationsHandler = async (request: Request, response: Response) => {
  try {
    const filters = listSchema.parse(request.query);
    const registrations = await registrationService.list(filters, request.user?.ministryIds);
    return response.json(registrations);
  } catch (error: any) {
    console.error("Erro ao listar inscrições:", error);
    return response.status(500).json({
      message: "Erro ao listar inscrições",
      error: error.message
    });
  }
};

export const registrationsReportHandler = async (request: Request, response: Response) => {
  const { groupBy, ...filters } = reportSchema.parse(request.query);
  const report = await registrationService.report(filters, groupBy, request.user?.ministryIds);
  return response.json(report);
};

export const downloadRegistrationsReportHandler = async (request: Request, response: Response) => {
  const { groupBy, template, layout, ...filters } = reportDownloadSchema.parse(request.query);
  const pdfBuffer =
    template === "event"
      ? await registrationService.generateEventSheetPdf(
          filters,
          groupBy,
          (layout as any) ?? "single",
          request.user?.ministryIds
        )
      : await registrationService.generateReportPdf(filters, groupBy, request.user?.ministryIds);
  const filename = `relatorio-inscricoes-${groupBy}-${Date.now()}.pdf`;
  response.setHeader("Content-Type", "application/pdf");
  response.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  return response.send(pdfBuffer);
};

export const updateRegistrationHandler = async (request: Request, response: Response) => {
  const payload = updateSchema.parse(request.body);
  const registration = await registrationService.update(request.params.id, payload, request.user?.id);
  return response.json(registration);
};

export const cancelRegistrationHandler = async (request: Request, response: Response) => {
  await registrationService.cancel(request.params.id);
  return response.status(204).send();
};

export const reactivateRegistrationHandler = async (request: Request, response: Response) => {
  const result = await registrationService.reactivate(request.params.id, request.user?.id);
  return response.json(result);
};

export const deleteRegistrationHandler = async (request: Request, response: Response) => {
  await registrationService.delete(request.params.id);
  return response.status(204).send();
};

export const refundRegistrationHandler = async (request: Request, response: Response) => {
  const payload = refundSchema.parse(request.body);
  const registration = await registrationService.findById(request.params.id);
  if (!registration?.order) {
    throw new NotFoundError("Inscrição não encontrada");
  }
  const amountCents = payload.amountCents ?? registration.priceCents ?? registration.event.priceCents;

  const registerManualRefund = async (options?: { warning?: string }) => {
    const manualRefundId = `MANUAL-REFUND-${registration.id}-${Date.now()}`;
    const combinedReason = [payload.reason, options?.warning].filter(Boolean).join(" | ") || undefined;
    await orderService.markRefunded({
      orderId: registration.orderId,
      registrationId: registration.id,
      amountCents,
      mpRefundId: manualRefundId,
      reason: combinedReason,
      actorUserId: request.user?.id
    });
    const body: Record<string, unknown> = {
      refundId: manualRefundId,
      status: "MANUAL_REFUND"
    };
    if (options?.warning) {
      body.warning = options.warning;
    }
    return response.status(options?.warning ? 202 : 200).json(body);
  };

  const orderPaymentMethod = registration.order.paymentMethod as PaymentMethod | null;
  const mpPaymentId = registration.order.mpPaymentId;
  const isMercadoPagoPayment =
    orderPaymentMethod === PaymentMethod.PIX_MP &&
    typeof mpPaymentId === "string" &&
    mpPaymentId.trim().length > 0 &&
    !mpPaymentId.startsWith("MANUAL-");

  if (!isMercadoPagoPayment) {
    return registerManualRefund();
  }

  try {
    const refund = await paymentService.refundRegistration(
      registration.orderId,
      registration.id,
      amountCents
    );

    await orderService.markRefunded({
      orderId: registration.orderId,
      registrationId: registration.id,
      amountCents,
      mpRefundId: String(refund.id),
      reason: payload.reason,
      actorUserId: request.user?.id
    });

    return response.json({ refundId: refund.id, status: refund.status });
  } catch (error) {
    if (error instanceof AppError && error.statusCode >= 500) {
      logger.warn(
        {
          registrationId: registration.id,
          orderId: registration.orderId,
          message: error.message
        },
        "Falha no estorno Mercado Pago, registrando manualmente"
      );
      return registerManualRefund({ warning: error.message });
    }
    throw error;
  }
};

export const markRegistrationsPaidHandler = async (request: Request, response: Response) => {
  const payload = bulkMarkPaidSchema.parse(request.body);
  const result = await orderService.markManualRegistrationsPaid(
    payload.registrationIds,
    {
      paidAt: payload.paidAt ? new Date(payload.paidAt) : undefined,
      reference: payload.reference
    },
    request.user?.id
  );
  return response.json(result);
};

// Gera/renova um link de pagamento exclusivo para uma inscrição
// - Se a inscrição estiver em um pedido com outras inscrições, cria um novo pedido apenas para ela
// - Se já estiver sozinha em um pedido, apenas gera uma nova preferência e invalida links antigos
export const regenerateRegistrationPaymentLinkHandler = async (
  request: Request,
  response: Response
) => {
  const { id } = request.params;
  const result = await orderService.createIndividualPaymentForRegistration(id);
  return response.json(result);
};

// Histórico da inscrição
export const getRegistrationHistoryHandler = async (request: Request, response: Response) => {
  const { id } = request.params;
  const history = await registrationService.getHistory(id);
  return response.json(history);
};
