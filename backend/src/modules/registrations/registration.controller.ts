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
import { env } from "../../config/env";
import { getScopedMinistryIds } from "../../utils/user-scope";
import { hasPermission } from "../../utils/permissions";
import { reportJobService } from "../reports/report-job.service";

const REPORT_ERROR_MESSAGE = "Nao foi possivel gerar o relatorio. Verifique os dados do evento.";
const reportErrorPayload = { success: false, message: REPORT_ERROR_MESSAGE };

const respondReportError = (response: Response, error: unknown, context: string) => {
  logger.error({ error }, context);
  const status = error instanceof AppError ? error.statusCode : 500;
  return response.status(status).json(reportErrorPayload);
};

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
  status: optionalStatus,
  lotId: optionalId,
  search: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().max(120).optional()
  )
});

const listWithPaginationSchema = listSchema.extend({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(500).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional()
});
const asyncFlagSchema = z.preprocess((value) => {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["1", "true", "yes", "on"].includes(normalized)) return true;
    if (["0", "false", "no", "off"].includes(normalized)) return false;
  }
  if (typeof value === "boolean") return value;
  return undefined;
}, z.boolean().optional());
const reportSchema = listSchema.extend({
  groupBy: z.enum(["event", "church"])
});
const reportDownloadSchema = reportSchema.extend({
  template: z.enum(["standard", "event"]).optional().default("standard"),
  layout: z.enum(["single", "two", "four"]).optional(),
  async: asyncFlagSchema
});
const listPdfSchema = listSchema.extend({
  async: asyncFlagSchema
});

const onlyDigits = (v: unknown) => (typeof v === "string" ? v.replace(/\D/g, "") : v);

const toUppercase = (value: string) => value.trim().toUpperCase();

const updateSchema = z.object({
  districtId: z.string().uuid().optional(),
  churchId: z.string().uuid().optional(),
  fullName: z.string().min(3).transform(toUppercase).optional(),
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
  reference: z.string().min(3).optional(),
  paymentMethod: z.nativeEnum(PaymentMethod).optional()
});

const paymentOrderSchema = z.object({
  registrationIds: z.array(cuidOrUuid).min(1),
  paymentMethod: z.nativeEnum(PaymentMethod).optional()
});

const applyScopedLocationFilters = <T extends { churchId?: string; districtId?: string }>(
  filters: T,
  user?: Request["user"]
) => {
  if (!user) return filters;
  const scoped = { ...filters };
  if (user.role === "DiretorLocal") {
    if (user.churchId) {
      scoped.churchId = user.churchId;
    }
    if (user.districtScopeId) {
      scoped.districtId = user.districtScopeId;
    }
  } else if (user.role === "AdminDistrital") {
    if (user.districtScopeId) {
      scoped.districtId = user.districtScopeId;
    }
  }
  return scoped;
};

export const listRegistrationsHandler = async (request: Request, response: Response) => {
  try {
    const { page, pageSize, limit, ...filters } = listWithPaginationSchema.parse(request.query);
    const scopedFilters = applyScopedLocationFilters(filters, request.user);
    const ministryIds = getScopedMinistryIds(request.user);

    const resolvedPage = page ?? 1;
    const resolvedLimit = Math.min(limit ?? pageSize ?? 200, 500);

    if (page || pageSize || limit) {
      const { items, total, totalPages } = await registrationService.listPaged(scopedFilters, ministryIds, {
        page: resolvedPage,
        pageSize: resolvedLimit
      });
      const hasMore = totalPages > 0 ? resolvedPage < totalPages : false;
      return response.json({
        data: items,
        items,
        page: resolvedPage,
        limit: resolvedLimit,
        pageSize: resolvedLimit,
        total,
        totalPages,
        hasMore
      });
    }

    const registrations = await registrationService.list(scopedFilters, ministryIds);
    return response.json(registrations);
  } catch (error: any) {
    console.error("Erro ao listar inscricoes:", error);
    return response.status(500).json({
      message: "Erro ao listar inscricoes",
      error: error.message
    });
  }
};

export const registrationsReportHandler = async (request: Request, response: Response) => {
  try {
    const { groupBy, ...filters } = reportSchema.parse(request.query);
    const scopedFilters = applyScopedLocationFilters(filters, request.user);
    const ministryIds = getScopedMinistryIds(request.user);
    await registrationService.validateReportAvailability(scopedFilters, ministryIds);
    const report = await registrationService.report(scopedFilters, groupBy, ministryIds);
    return response.json(report);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      logger.warn({ error: error.flatten() }, "Parametros invalidos");
      return response.status(400).json(reportErrorPayload);
    }
    return respondReportError(response, error, "Erro ao carregar relatorio de inscricoes");
  }
};

export const downloadRegistrationsReportHandler = async (request: Request, response: Response) => {
  const origin = request.headers.origin;
  if (origin && env.corsOrigins.includes(origin)) {
    response.setHeader("Access-Control-Allow-Origin", origin);
    response.setHeader("Vary", "Origin");
    response.setHeader("Access-Control-Allow-Credentials", "true");
  }

  try {
    const { groupBy, template, layout, async: asyncMode, ...filters } = reportDownloadSchema.parse(request.query);

    const ministryIds = getScopedMinistryIds(request.user);
    const scopedFilters = applyScopedLocationFilters(filters, request.user);
    if (asyncMode) {
      const job = reportJobService.createRegistrationReportJob(
        {
          filters: scopedFilters,
          groupBy,
          template,
          layout: (layout as any) ?? undefined,
          ministryIds
        },
        request.user?.id ?? null
      );
      return response.json({ success: true, jobId: job.id, status: job.status });
    }
    await registrationService.validateReportAvailability(scopedFilters, ministryIds);
    const pdfBuffer =
      template === "event"
        ? await registrationService.generateEventSheetPdf(
            scopedFilters,
            groupBy,
            (layout as any) ?? "single",
            ministryIds
          )
        : await registrationService.generateReportPdf(scopedFilters, groupBy, ministryIds);
    const filename = `relatorio-inscricoes-${groupBy}-${Date.now()}.pdf`;
    response.setHeader("Content-Type", "application/pdf");
    response.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return response.send(pdfBuffer);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      logger.warn({ error: error.flatten() }, "Parametros invalidos");
      return response.status(400).json(reportErrorPayload);
    }
    return respondReportError(response, error, "Erro ao gerar relatorio de inscricoes");
  }
};

export const downloadRegistrationsListPdfHandler = async (request: Request, response: Response) => {
  const origin = request.headers.origin;
  if (origin && env.corsOrigins.includes(origin)) {
    response.setHeader("Access-Control-Allow-Origin", origin);
    response.setHeader("Vary", "Origin");
    response.setHeader("Access-Control-Allow-Credentials", "true");
  }

  try {
    const { async: asyncMode, ...filters } = listPdfSchema.parse(request.query);
    const ministryIds = getScopedMinistryIds(request.user);
    const scopedFilters = applyScopedLocationFilters(filters, request.user);
    if (asyncMode) {
      const includeCpf = hasPermission(request.user?.permissions, "registrations", "reports");
      const job = reportJobService.createRegistrationListJob(
        {
          filters: scopedFilters,
          includeCpf,
          ministryIds
        },
        request.user?.id ?? null
      );
      return response.json({ success: true, jobId: job.id, status: job.status });
    }
    await registrationService.validateReportAvailability(scopedFilters, ministryIds);
    const includeCpf = hasPermission(request.user?.permissions, "registrations", "reports");

    const pdfBuffer = await registrationService.generateListPdf(scopedFilters, ministryIds, {
      includeCpf
    });
    const filename = `lista-inscricoes-${Date.now()}.pdf`;
    response.setHeader("Content-Type", "application/pdf");
    response.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return response.send(pdfBuffer);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      logger.warn({ error: error.flatten() }, "Parametros invalidos");
      return response.status(400).json(reportErrorPayload);
    }
    return respondReportError(response, error, "Erro ao gerar lista de inscricoes em PDF");
  }
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

export const getRegistrationReceiptLinkHandler = async (request: Request, response: Response) => {
  const { id } = request.params;
  const link = await registrationService.getReceiptLink(id);
  return response.json(link);
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
      reference: payload.reference,
      paymentMethod: payload.paymentMethod
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

export const createPaymentForRegistrationsHandler = async (
  request: Request,
  response: Response
) => {
  const payload = paymentOrderSchema.parse(request.body);
  const result = await orderService.createPaymentForRegistrations(
    payload.registrationIds,
    payload.paymentMethod,
    request.user
  );
  return response.status(201).json(result);
};

// Histórico da inscrição
export const getRegistrationHistoryHandler = async (request: Request, response: Response) => {
  const { id } = request.params;
  const history = await registrationService.getHistory(id);
  return response.json(history);
};
