import { Request, Response } from "express";
import { z } from "zod";

import { registrationService } from "../registrations/registration.service";
import { sanitizeCpf } from "../../utils/mask";

const lookupSchema = z.object({
  cpf: z.string().min(11),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
});

export const lookupReceiptsHandler = async (request: Request, response: Response) => {
  const payload = lookupSchema.parse(request.body);
  const receipts = await registrationService.lookupReceipts(
    sanitizeCpf(payload.cpf),
    payload.birthDate
  );
  return response.json(receipts);
};

export const downloadReceiptHandler = async (request: Request, response: Response) => {
  const { registrationId } = request.params;
  const { token } = request.query;
  if (typeof token !== "string") {
    return response.status(400).json({ message: "Token obrigatório" });
  }
  const buffer = await registrationService.streamReceipt(registrationId, token);
  response.setHeader("Content-Type", "application/pdf");
  response.setHeader(
    "Content-Disposition",
    `attachment; filename=recibo-${registrationId}.pdf`
  );
  return response.send(buffer);
};
