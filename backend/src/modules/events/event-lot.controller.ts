import type { Request, Response } from "express";
import { z } from "zod";

import { eventLotService } from "./event-lot.service";

const cuidOrUuid = z.string().uuid().or(z.string().cuid());

const eventParamSchema = z.object({
  eventId: cuidOrUuid
});

const lotParamSchema = z.object({
  lotId: cuidOrUuid
});

const lotTypeSchema = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const normalized = value.trim().toUpperCase();
  if (normalized === "NORMAL") return "PADRAO";
  if (normalized === "PROMOCIONAL") return "PROMOCIONAL";
  if (normalized === "PADRAO") return "PADRAO";
  return value;
}, z.enum(["PADRAO", "PROMOCIONAL"]));

const createSchema = z.object({
  name: z.string().min(2),
  priceCents: z.number().int().min(0),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().nullable().optional(),
  type: lotTypeSchema.optional(),
  tipo_lote: lotTypeSchema.optional()
});

const updateSchema = createSchema.partial();

export const listEventLotsHandler = async (request: Request, response: Response) => {
  const { eventId } = eventParamSchema.parse(request.params);
  const lots = await eventLotService.list(eventId);
  return response.json(lots);
};

export const createEventLotHandler = async (request: Request, response: Response) => {
  const { eventId } = eventParamSchema.parse(request.params);
  const payload = createSchema.parse(request.body);
  const resolvedType = payload.type ?? payload.tipo_lote;
  const lot = await eventLotService.create(
    eventId,
    {
      name: payload.name,
      priceCents: payload.priceCents,
      startsAt: new Date(payload.startsAt),
      endsAt: payload.endsAt == null ? null : new Date(payload.endsAt),
      type: resolvedType
    },
    request.user
  );
  return response.status(201).json(lot);
};

export const updateEventLotHandler = async (request: Request, response: Response) => {
  lotParamSchema.parse(request.params);
  const lotId = request.params.lotId;
  const payload = updateSchema.parse(request.body);
  const resolvedType = payload.type ?? payload.tipo_lote;
  const lot = await eventLotService.update(
    lotId,
    {
      name: payload.name,
      priceCents: payload.priceCents,
      startsAt: payload.startsAt ? new Date(payload.startsAt) : undefined,
      endsAt:
        payload.endsAt === undefined
          ? undefined
          : payload.endsAt === null
            ? null
            : new Date(payload.endsAt),
      type: resolvedType
    },
    request.user
  );
  return response.json(lot);
};

export const deleteEventLotHandler = async (request: Request, response: Response) => {
  lotParamSchema.parse(request.params);
  await eventLotService.delete(request.params.lotId, request.user);
  return response.status(204).send();
};
