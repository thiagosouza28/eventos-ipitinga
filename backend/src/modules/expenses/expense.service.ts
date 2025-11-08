import cuid2 from "@paralleldrive/cuid2";
import { prisma } from "../../lib/prisma";
import { AppError, NotFoundError } from "../../utils/errors";
import { auditService } from "../../services/audit.service";
import { storageService } from "../../storage/storage.service";
import { logger } from "../../utils/logger";

export class ExpenseService {
  async create(payload: {
    eventId: string;
    description: string;
    date: Date;
    amountCents: number;
    madeBy: string;
    items?: string;
    receiptUrl?: string;
  }) {
    // Verificar se o evento existe
    const event = await prisma.event.findUnique({ where: { id: payload.eventId } });
    if (!event) {
      throw new NotFoundError("Evento nao encontrado");
    }

    const expense = await prisma.expense.create({
      data: {
        id: cuid2.createId(),
        eventId: payload.eventId,
        description: payload.description.trim(),
        date: payload.date,
        amountCents: payload.amountCents,
        madeBy: payload.madeBy.trim(),
        items: payload.items?.trim() || null,
        receiptUrl: payload.receiptUrl || null
      }
    });

    await auditService.log({
      action: "EXPENSE_CREATED",
      entity: "expense",
      entityId: expense.id,
      metadata: {
        eventId: payload.eventId,
        amountCents: payload.amountCents
      }
    });

    return expense;
  }

  async update(
    id: string,
    payload: {
      description?: string;
      date?: Date;
      amountCents?: number;
      madeBy?: string;
      items?: string;
      receiptUrl?: string;
    }
  ) {
    const expense = await prisma.expense.findUnique({ where: { id } });
    if (!expense) {
      throw new NotFoundError("Despesa nao encontrada");
    }

    const updated = await prisma.expense.update({
      where: { id },
      data: {
        ...(payload.description !== undefined && { description: payload.description.trim() }),
        ...(payload.date !== undefined && { date: payload.date }),
        ...(payload.amountCents !== undefined && { amountCents: payload.amountCents }),
        ...(payload.madeBy !== undefined && { madeBy: payload.madeBy.trim() }),
        ...(payload.items !== undefined && { items: payload.items?.trim() || null }),
        ...(payload.receiptUrl !== undefined && { receiptUrl: payload.receiptUrl || null })
      }
    });

    await auditService.log({
      action: "EXPENSE_UPDATED",
      entity: "expense",
      entityId: id,
      metadata: {
        changes: payload
      }
    });

    return updated;
  }

  async delete(id: string) {
    const expense = await prisma.expense.findUnique({ where: { id } });
    if (!expense) {
      throw new NotFoundError("Despesa nao encontrada");
    }

    await prisma.expense.delete({ where: { id } });

    await auditService.log({
      action: "EXPENSE_DELETED",
      entity: "expense",
      entityId: id
    });
  }

  async listByEvent(eventId: string) {
    try {
      // Verificar se a tabela Expense existe
      const tables = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='Expense'`
      );

      if (tables.length === 0) {
        // Se a tabela não existe, retornar array vazio
        return [];
      }

      return prisma.expense.findMany({
        where: { eventId },
        orderBy: { date: "desc" },
        include: {
          event: {
            select: {
              id: true,
              title: true,
              slug: true
            }
          }
        }
      });
    } catch (error: any) {
      // Se houver erro de tabela não encontrada, retornar array vazio
      if (error.code === "P2021" || error.code === "P2022" || error.message?.includes("does not exist")) {
        logger.warn({ eventId, error }, "Tabela Expense não encontrada, retornando array vazio");
        return [];
      }
      throw error;
    }
  }

  async getById(id: string) {
    const expense = await prisma.expense.findUnique({
      where: { id },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            slug: true
          }
        }
      }
    });

    if (!expense) {
      throw new NotFoundError("Despesa nao encontrada");
    }

    return expense;
  }

  async getTotalByEvent(eventId: string): Promise<number> {
    const result = await prisma.expense.aggregate({
      where: { eventId },
      _sum: {
        amountCents: true
      }
    });

    return result._sum.amountCents || 0;
  }
}

export const expenseService = new ExpenseService();

