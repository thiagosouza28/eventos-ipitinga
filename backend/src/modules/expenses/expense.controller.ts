import { Request, Response } from "express";
import { z } from "zod";
import { expenseService } from "./expense.service";
import { storageService } from "../../storage/storage.service";

const cuidOrUuid = z.string().uuid().or(z.string().cuid());

const createExpenseSchema = z.object({
  eventId: cuidOrUuid,
  description: z.string().min(1, "Descrição é obrigatória"),
  date: z.string().datetime(),
  amountCents: z.number().int().positive("Valor deve ser positivo"),
  madeBy: z.string().min(1, "Responsável é obrigatório"),
  items: z.string().optional(),
  receiptBase64: z.string().optional()
});

const updateExpenseSchema = z.object({
  description: z.string().min(1).optional(),
  date: z.string().datetime().optional(),
  amountCents: z.number().int().positive().optional(),
  madeBy: z.string().min(1).optional(),
  items: z.string().optional(),
  receiptBase64: z.string().optional()
});

export const createExpenseHandler = async (request: Request, response: Response) => {
  const payload = createExpenseSchema.parse(request.body);
  
  let receiptUrl: string | undefined;
  if (payload.receiptBase64) {
    try {
      receiptUrl = await storageService.saveBase64Image(payload.receiptBase64);
    } catch (error) {
      return response.status(400).json({
        message: "Erro ao processar imagem do comprovante"
      });
    }
  }

  const expense = await expenseService.create({
    eventId: payload.eventId,
    description: payload.description,
    date: new Date(payload.date),
    amountCents: payload.amountCents,
    madeBy: payload.madeBy,
    items: payload.items,
    receiptUrl
  });

  return response.status(201).json(expense);
};

export const updateExpenseHandler = async (request: Request, response: Response) => {
  const { id } = request.params;
  const payload = updateExpenseSchema.parse(request.body);

  let receiptUrl: string | undefined;
  if (payload.receiptBase64) {
    try {
      receiptUrl = await storageService.saveBase64Image(payload.receiptBase64);
    } catch (error) {
      return response.status(400).json({
        message: "Erro ao processar imagem do comprovante"
      });
    }
  }

  const expense = await expenseService.update(id, {
    description: payload.description,
    date: payload.date ? new Date(payload.date) : undefined,
    amountCents: payload.amountCents,
    madeBy: payload.madeBy,
    items: payload.items,
    receiptUrl
  });

  return response.json(expense);
};

export const deleteExpenseHandler = async (request: Request, response: Response) => {
  const { id } = request.params;
  await expenseService.delete(id);
  return response.status(204).send();
};

export const listExpensesByEventHandler = async (request: Request, response: Response) => {
  try {
    const { eventId } = request.params;
    const expenses = await expenseService.listByEvent(eventId);
    return response.json(expenses);
  } catch (error: any) {
    console.error("Erro ao listar despesas:", error);
    return response.status(500).json({
      message: "Erro ao listar despesas",
      error: error.message
    });
  }
};

export const getExpenseHandler = async (request: Request, response: Response) => {
  const { id } = request.params;
  const expense = await expenseService.getById(id);
  return response.json(expense);
};

