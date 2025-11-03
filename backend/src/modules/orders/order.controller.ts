import { Request, Response } from "express";
import { z } from "zod";

import { orderService } from "./order.service";
import { registrationService } from "../registrations/registration.service";
import { PaymentMethod } from "../../config/payment-methods";
import { Gender } from "../../config/gender";

const cuidOrUuid = z.string().uuid().or(z.string().cuid());

const markPaidSchema = z.object({
  paymentId: z.string().min(3).optional(),
  paidAt: z.string().datetime().optional(),
  manualReference: z.string().min(1).optional()
});

const cpfSchema = z
  .string()
  .min(11)
  .transform((value) => value.replace(/\D/g, ""));

const startSchema = z.object({
  eventId: cuidOrUuid,
  buyerCpf: cpfSchema
});

const batchSchema = z.object({
  eventId: cuidOrUuid,
  buyerCpf: cpfSchema,
  paymentMethod: z.nativeEnum(PaymentMethod).optional(),
  people: z
    .array(
      z.object({
        fullName: z.string().min(3),
        cpf: cpfSchema,
        birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        gender: z.nativeEnum(Gender),
        districtId: cuidOrUuid,
        churchId: cuidOrUuid,
        photoUrl: z
          .string()
          .min(20, "Foto do participante deve ser uma imagem em base64")
          .optional()
          .or(z.literal(null))
      })
    )
    .min(1)
});

const participantCheckSchema = z.object({
  eventId: cuidOrUuid,
  cpf: cpfSchema
});

export const startInscriptionHandler = async (request: Request, response: Response) => {
  const payload = startSchema.parse(request.body);
  const pending = await orderService.findPendingOrder(payload.eventId, payload.buyerCpf);
  return response.json({
    orderPending: pending
      ? {
          orderId: pending.id,
          expiresAt: pending.expiresAt,
          payment: await orderService.getPayment(pending.id)
        }
      : null
  });
};

export const createBatchInscriptionHandler = async (request: Request, response: Response) => {
  const payload = batchSchema.parse(request.body);
  const result = await orderService.createBatch(payload);
  return response.status(201).json(result);
};

export const getOrderPaymentHandler = async (request: Request, response: Response) => {
  const { orderId } = request.params;
  const payment = await orderService.getPayment(orderId);
  return response.json(payment);
};

export const markOrderPaidHandler = async (request: Request, response: Response) => {
  const { paymentId, paidAt, manualReference } = markPaidSchema.parse(request.body);
  const order = await orderService.markPaid(
    request.params.id,
    paymentId ?? `MANUAL-${Date.now()}`,
    {
      paidAt: paidAt ? new Date(paidAt) : undefined,
      manualReference: manualReference ?? paymentId ?? undefined
    }
  );
  return response.json(order);
};

export const listOrdersHandler = async (request: Request, response: Response) => {
  const schema = z.object({
    eventId: z.string().uuid().optional(),
    status: z.enum(["PENDING", "PAID", "PARTIALLY_REFUNDED", "CANCELED", "EXPIRED"]).optional()
  });
  const query = schema.parse(request.query);
  const orders = await orderService.list(query);
  return response.json(orders);
};

export const checkParticipantCpfHandler = async (request: Request, response: Response) => {
  const payload = participantCheckSchema.parse(request.body);
  const [existsInEvent, profile] = await Promise.all([
    registrationService.isCpfRegistered(payload.eventId, payload.cpf),
    registrationService.getLatestProfileByCpf(payload.cpf)
  ]);
  return response.json({
    existsInEvent,
    profile
  });
};

