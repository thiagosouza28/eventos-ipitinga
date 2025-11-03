import { Request, Response } from "express";
import { z } from "zod";

import { checkinService } from "./checkin.service";

export const getCheckinDashboardHandler = async (request: Request, response: Response) => {
  const { eventId } = request.params;
  const data = await checkinService.getEventDashboard(eventId);
  return response.json(data);
};

const cuidOrUuid = z.string().uuid().or(z.string().cuid());

const scanSchema = z.object({
  registrationId: cuidOrUuid,
  signature: z.string().min(10)
});

const manualSchema = z.object({
  cpf: z.string().min(11),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
});

const validateSchema = z.object({
  rid: cuidOrUuid,
  sig: z.string().min(10)
});

const confirmSchema = z.object({
  rid: cuidOrUuid,
  sig: z.string().min(10),
  password: z.string().min(4)
});

const confirmAdminSchema = z.object({
  registrationId: cuidOrUuid,
  signature: z.string().min(10).optional()
});

export const scanCheckinHandler = async (request: Request, response: Response) => {
  const payload = scanSchema.parse(request.body);
  const registration = await checkinService.scan(payload);
  return response.json(registration);
};

export const manualCheckinHandler = async (request: Request, response: Response) => {
  const payload = manualSchema.parse(request.body);
  const result = await checkinService.manualLookup(payload);
  return response.json(result);
};

export const confirmAdminCheckinHandler = async (request: Request, response: Response) => {
  const payload = confirmAdminSchema.parse(request.body);
  const result = await checkinService.confirm(payload);
  return response.json(result);
};

export const validateCheckinLinkHandler = async (request: Request, response: Response) => {
  const { rid, sig } = validateSchema.parse(request.query);
  const result = await checkinService.validateLink({ registrationId: rid, signature: sig });
  return response.json(result);
};

export const confirmCheckinLinkHandler = async (request: Request, response: Response) => {
  const { rid, sig, password } = confirmSchema.parse(request.body);
  const result = await checkinService.confirmLink({ registrationId: rid, signature: sig, password });
  return response.json(result);
};


