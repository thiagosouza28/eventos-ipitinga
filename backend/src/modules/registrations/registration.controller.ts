import { Request, Response } from "express";
import { z } from "zod";

import { orderService } from "../orders/order.service";
import { paymentService } from "../../services/payment.service";
import { registrationService } from "./registration.service";
import { NotFoundError } from "../../utils/errors";
import { Gender } from "../../config/gender";

const cuidOrUuid = z.string().uuid().or(z.string().cuid());
const optionalId = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  cuidOrUuid.optional()
);

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

const updateSchema = z.object({
  districtId: z.string().uuid().optional(),
  churchId: z.string().uuid().optional(),
  fullName: z.string().min(3).optional(),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
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
    const registrations = await registrationService.list(filters);
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
  const report = await registrationService.report(filters, groupBy);
  return response.json(report);
};

export const downloadRegistrationsReportHandler = async (request: Request, response: Response) => {
  const { groupBy, ...filters } = reportSchema.parse(request.query);
  const pdfBuffer = await registrationService.generateReportPdf(filters, groupBy);
  const filename = `relatorio-inscricoes-${groupBy}-${Date.now()}.pdf`;
  response.setHeader("Content-Type", "application/pdf");
  response.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  return response.send(pdfBuffer);
};

export const updateRegistrationHandler = async (request: Request, response: Response) => {
  const payload = updateSchema.parse(request.body);
  const registration = await registrationService.update(request.params.id, payload);
  return response.json(registration);
};

export const cancelRegistrationHandler = async (request: Request, response: Response) => {
  await registrationService.cancel(request.params.id);
  return response.status(204).send();
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
    reason: payload.reason
  });

  return response.json({ refundId: refund.id, status: refund.status });
};

export const markRegistrationsPaidHandler = async (request: Request, response: Response) => {
  const payload = bulkMarkPaidSchema.parse(request.body);
  const result = await orderService.markManualRegistrationsPaid(payload.registrationIds, {
    paidAt: payload.paidAt ? new Date(payload.paidAt) : undefined,
    reference: payload.reference
  });
  return response.json(result);
};
