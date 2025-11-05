import { Request, Response } from "express";
import { z } from "zod";

import { orderService } from "./order.service";
import { registrationService } from "../registrations/registration.service";
import { paymentService } from "../../services/payment.service";
import { PaymentMethod } from "../../config/payment-methods";
import { Gender } from "../../config/gender";
import { BulkPaymentDto } from "./dtos/bulk-payment.dto";

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
  const pendingOrders = await orderService.findPendingOrder(payload.eventId, payload.buyerCpf);
  
  const pendingDetails = await Promise.all(
    pendingOrders.map(async (order) => ({
      orderId: order.id,
      expiresAt: order.expiresAt,
      totalCents: order.totalCents,
      registrations: order.registrations.map(reg => ({
        id: reg.id,
        fullName: reg.fullName,
        cpf: reg.cpf
      })),
      payment: await orderService.getPayment(order.id)
    }))
  );

  return response.json({
    pendingOrders: pendingDetails
  });
};

export const createBatchInscriptionHandler = async (request: Request, response: Response) => {
  const payload = batchSchema.parse(request.body);
  const actorId = request.user?.id;
  const actorRole = request.user?.role;
  const result = await orderService.createBatch(payload, actorId, actorRole);
  return response.status(201).json(result);
};

export const getOrderPaymentHandler = async (request: Request, response: Response) => {
  const { orderId } = request.params;
  const payment = await orderService.getPayment(orderId);
  return response.json(payment);
};

export const getPaymentByPreferenceIdHandler = async (request: Request, response: Response) => {
  const { preferenceId } = request.params;
  
  try {
    const preference = await paymentService.getPreference(preferenceId);
    return response.json(preference);
  } catch (error: any) {
    return response.status(error.statusCode || 500).json({
      message: error.message || "Erro ao buscar pagamento"
    });
  }
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

export const listPendingOrdersHandler = async (request: Request, response: Response) => {
  const schema = z.object({
    cpf: z.string()
      .min(11)
      .transform((value) => value.replace(/\D/g, ""))
  });
  const query = schema.parse(request.query);
  const orders = await orderService.findAllPendingOrders(query.cpf);
  return response.json({ orders });
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

export const bulkPaymentHandler = async (request: Request, response: Response) => {
  const payload = BulkPaymentDto.parse(request.body);
  
  if (!payload.orderIds || payload.orderIds.length === 0) {
    return response.status(400).json({ message: "Nenhum pedido informado" });
  }

  try {
    const payment = await paymentService.createBulkPreference(payload.orderIds);
    
    return response.json({
      paymentId: payment.preferenceId,
      orderCount: payment.orderCount,
      totalCents: payment.totalCents,
      eventNames: payment.eventNames,
      initPoint: payment.initPoint,
      pixQrData: payment.pixQrData
    });
  } catch (error: any) {
    return response.status(error.statusCode || 500).json({
      message: error.message || "Erro ao processar pagamento em lote"
    });
  }
};

