import { Request, Response } from "express";
import { z } from "zod";

import { eventService } from "./event.service";
import { PaymentMethod } from "../../config/payment-methods";
import { PendingPaymentValueRuleValues } from "../../config/pending-payment-value-rule";
import { getScopedMinistryIds } from "../../utils/user-scope";

const paymentMethodSchema = z.nativeEnum(PaymentMethod);
const bannerFieldSchema = z
  .string()
  .trim()
  .regex(
    /^(https?:\/\/.+|[\w.\-\/]+)$/i,
    "Informe uma URL completa ou o nome de um arquivo salvo (ex.: banner.jpg)"
  );
const slugFieldSchema = z
  .string()
  .trim()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/i, "Slug deve conter apenas letras, números e hífens");

const pendingPaymentValueRuleSchema = z.enum(PendingPaymentValueRuleValues);

const createSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  location: z.string().min(3),
  bannerUrl: bannerFieldSchema.optional(),
  slug: slugFieldSchema.optional(),
  isFree: z.boolean(),
  priceCents: z.number().int().min(0).optional(),
  minAgeYears: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  paymentMethods: z.array(paymentMethodSchema).min(1).optional(),
  pendingPaymentValueRule: pendingPaymentValueRuleSchema.optional(),
  ministryId: z.string().cuid()
});

const updateSchema = createSchema.partial();

export const getEventBySlugHandler = async (request: Request, response: Response) => {
  const event = await eventService.getPublicBySlug(request.params.slug);
  return response.json(event);
};

export const listEventsAdminHandler = async (request: Request, response: Response) => {
  const ministryIds = getScopedMinistryIds(request.user);
  const events = await eventService.listAdmin(ministryIds);
  return response.json(events);
};

export const listPublicEventsHandler = async (_request: Request, response: Response) => {
  const events = await eventService.listPublic();
  return response.json(events);
};

export const createEventHandler = async (request: Request, response: Response) => {
  const payload = createSchema.parse(request.body);
  const event = await eventService.create(payload, request.user);
  return response.status(201).json(event);
};

export const updateEventHandler = async (request: Request, response: Response) => {
  const payload = updateSchema.parse(request.body);
  const event = await eventService.update(request.params.id, payload, request.user);
  return response.json(event);
};

export const deleteEventHandler = async (request: Request, response: Response) => {
  await eventService.delete(request.params.id, request.user);
  return response.status(204).send();
};
