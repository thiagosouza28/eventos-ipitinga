import { Request, Response } from "express";
import { z } from "zod";

import { orderService } from "./order.service";
import { registrationService } from "../registrations/registration.service";
import { paymentService } from "../../services/payment.service";
import { PaymentMethod } from "../../config/payment-methods";
import { Gender } from "../../config/gender";
import { BulkPaymentDto } from "./dtos/bulk-payment.dto";
import { storageService } from "../../storage/storage.service";

// Schema que aceita tanto CUID quanto UUID sem mostrar erro de UUID primeiro
// CUID do Prisma: pode começar com qualquer letra minúscula seguido de caracteres alfanuméricos
// UUID: formato padrão com hífens (8-4-4-4-12)
const cuidOrUuid = z.string().refine(
  (val) => {
    if (!val || typeof val !== 'string') return false;
    const trimmed = val.trim();
    if (trimmed.length === 0) return false;
    
    // Validar como UUID (formato com hífens: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(trimmed)) return true;
    
    // Validar como CUID (Prisma: começa com letra minúscula seguido de caracteres alfanuméricos)
    // CUIDs do Prisma geralmente têm 20-30 caracteres no total
    // Aceitamos strings que começam com letra minúscula seguida de pelo menos 15 caracteres alfanuméricos
    const cuidRegex = /^[a-z][0-9a-z]{15,}$/i;
    if (cuidRegex.test(trimmed)) return true;
    
    return false;
  },
  { message: "Deve ser um ID válido (CUID ou UUID)" }
);

const dataUrlRegex = /^data:.+;base64,/i;

const markPaidSchema = z.object({
  paymentId: z.string().min(3).optional(),
  paidAt: z.string().datetime().optional(),
  manualReference: z.string().min(1).optional(),
  proofFile: z
    .string()
    .refine((value) => dataUrlRegex.test(value), {
      message: "Comprovante deve estar em formato base64 (data URL)"
    })
    .optional(),
  proofUrl: z.string().url().optional()
});

const cpfSchema = z
  .string()
  .min(11)
  .transform((value) => value.replace(/\D/g, ""));

const startSchema = z.object({
  eventId: cuidOrUuid,
  buyerCpf: cpfSchema
});

const uppercaseField = (value: string) => value.trim().toUpperCase();

const batchSchema = z.object({
  eventId: cuidOrUuid,
  buyerCpf: cpfSchema,
  paymentMethod: z.nativeEnum(PaymentMethod).optional(),
  people: z
    .array(
      z.object({
        fullName: z.string().min(3).transform(uppercaseField),
        cpf: cpfSchema,
        birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        gender: z.preprocess(
          (val) => {
            if (!val) return Gender.OTHER;
            const str = String(val).trim().toUpperCase();
            // Aceitar valores em português ou inglês
            if (str === "MASCULINO" || str === "MALE") return Gender.MALE;
            if (str === "FEMININO" || str === "FEMALE") return Gender.FEMALE;
            if (str === "OUTRO" || str === "OTHER") return Gender.OTHER;
            return str as Gender; // Tentar usar o valor original se já for válido
          },
          z.nativeEnum(Gender)
        ),
        districtId: cuidOrUuid,
        churchId: cuidOrUuid,
        photoUrl: z
          .union([
            z.string().min(20, "Foto do participante deve ser uma imagem em base64"),
            z.literal(null),
            z.literal("")
          ])
          .optional()
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
  try {
    const payload = batchSchema.parse(request.body);
    const result = await orderService.createBatch(payload, request.user);
    return response.status(201).json(result);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      console.error('[ERROR] createBatchInscriptionHandler - Erro de validação:');
      console.error('[ERROR] - Erros detalhados:', JSON.stringify(error.errors, null, 2));
      console.error('[ERROR] - Request body:', JSON.stringify(request.body, null, 2));
      
      return response.status(422).json({
        message: "Dados inválidos",
        issues: error.flatten(),
        errors: error.errors
      });
    }
    throw error;
  }
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
  const { paymentId, paidAt, manualReference, proofFile, proofUrl } = markPaidSchema.parse(
    request.body
  );

  let manualProofUrl: string | null | undefined;
  if (proofFile) {
    manualProofUrl = await storageService.saveBase64Attachment(proofFile);
  } else if (proofUrl) {
    manualProofUrl = proofUrl;
  }

  const order = await orderService.markPaid(
    request.params.id,
    paymentId ?? `MANUAL-${Date.now()}`,
    {
      paidAt: paidAt ? new Date(paidAt) : undefined,
      manualReference: manualReference ?? paymentId ?? undefined,
      actorUserId: request.user?.id,
      paymentProofUrl: manualProofUrl
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

