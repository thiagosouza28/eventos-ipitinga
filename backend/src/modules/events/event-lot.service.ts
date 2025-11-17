import { prisma } from "../../lib/prisma";
import { AppError, ConflictError, NotFoundError } from "../../utils/errors";

type ActorUser = {
  id?: string | null;
  role?: string | null;
};

type LotInput = {
  name: string;
  priceCents: number;
  startsAt: Date;
  endsAt?: Date | null;
};

const normalizeRange = (startsAt: Date, endsAt?: Date | null) => {
  const start = new Date(startsAt);
  if (Number.isNaN(start.getTime())) {
    throw new AppError("Data inicial invalida", 400);
  }
  let end: Date | null = null;
  if (endsAt) {
    end = new Date(endsAt);
    if (Number.isNaN(end.getTime())) {
      throw new AppError("Data final invalida", 400);
    }
    if (end <= start) {
      throw new AppError("Data final deve ser posterior a data inicial", 400);
    }
  }
  return { start, end };
};

const ensureNoOverlap = async (
  eventId: string,
  range: { start: Date; end: Date | null },
  ignoreId?: string
) => {
  const overlap = await prisma.eventLot.findFirst({
    where: {
      eventId,
      id: ignoreId ? { not: ignoreId } : undefined,
      AND: [
        { startsAt: { lte: range.end ?? new Date("9999-12-31T23:59:59.999Z") } },
        {
          OR: [
            { endsAt: null },
            { endsAt: { gte: range.start } }
          ]
        }
      ]
    }
  });
  if (overlap) {
    throw new ConflictError("Periodo informado conflita com outro lote do evento");
  }
};

class EventLotService {
  private assertCanManage(event: { createdById?: string | null }, actor?: ActorUser) {
    if (!actor) {
      throw new AppError("Permissão insuficiente", 403);
    }
    if (actor.role === "AdminGeral") {
      return;
    }
    const createdById = (event as any).createdById ?? null;
    if (actor.role === "AdminDistrital" && createdById === actor.id) {
      return;
    }
    if (actor.role === "AdminDistrital") {
      throw new AppError("Distritais só podem gerenciar eventos que cadastraram.", 403);
    }
    throw new AppError("Permissão insuficiente para gerenciar eventos.", 403);
  }

  list(eventId: string) {
    return prisma.eventLot.findMany({
      where: { eventId },
      orderBy: { startsAt: "asc" }
    });
  }

  async create(eventId: string, input: LotInput, actor?: ActorUser) {
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      throw new NotFoundError("Evento nao encontrado");
    }
    if (actor) {
      this.assertCanManage(event, actor);
    }
    const isFree = Boolean((event as any).isFree);
    if (isFree) {
      throw new AppError("Eventos gratuitos nao aceitam cadastro de lotes", 400);
    }
    if (input.priceCents < 0) {
      throw new AppError("Valor deve ser maior ou igual a zero", 400);
    }
    const range = normalizeRange(input.startsAt, input.endsAt);
    await ensureNoOverlap(eventId, range);

    const lot = await prisma.eventLot.create({
      data: {
        eventId,
        name: input.name.trim(),
        priceCents: input.priceCents,
        startsAt: range.start,
        endsAt: range.end
      }
    });
    return lot;
  }

  async update(lotId: string, data: Partial<LotInput>, actor?: ActorUser) {
    const lot = await prisma.eventLot.findUnique({
      where: { id: lotId },
      include: { event: true }
    });
    if (!lot) {
      throw new NotFoundError("Lote nao encontrado");
    }
    if (actor) {
      this.assertCanManage(lot.event, actor);
    }

    const isFree = Boolean((lot.event as any)?.isFree);
    if (isFree) {
      throw new AppError("Eventos gratuitos nao aceitam cadastro de lotes", 400);
    }

    let startsAt = lot.startsAt;
    let endsAt: Date | null = lot.endsAt;

    if (data.startsAt !== undefined || data.endsAt !== undefined) {
      const normalized = normalizeRange(
        data.startsAt ?? lot.startsAt,
        data.endsAt === undefined ? lot.endsAt : data.endsAt
      );
      startsAt = normalized.start;
      endsAt = normalized.end ?? null;
      await ensureNoOverlap(lot.eventId, { start: startsAt, end: endsAt }, lotId);
    }

    if (data.priceCents !== undefined && data.priceCents < 0) {
      throw new AppError("Valor deve ser maior ou igual a zero", 400);
    }

    const updated = await prisma.eventLot.update({
      where: { id: lotId },
      data: {
        name: data.name !== undefined ? data.name.trim() : lot.name,
        priceCents:
          data.priceCents !== undefined
            ? data.priceCents
            : lot.priceCents,
        startsAt,
        endsAt
      }
    });
    return updated;
  }

  async delete(lotId: string, actor?: ActorUser) {
    const lot = await prisma.eventLot.findUnique({
      where: { id: lotId },
      include: { event: true }
    });
    if (!lot) {
      throw new NotFoundError("Lote nao encontrado");
    }
    if (actor) {
      this.assertCanManage(lot.event, actor);
    }
    try {
      await prisma.eventLot.delete({ where: { id: lotId } });
    } catch (error: any) {
      if (error?.code === "P2003") {
        throw new ConflictError("Lote vinculado a pedidos nao pode ser removido");
      }
      throw error;
    }
  }

  findActive(eventId: string, referenceDate = new Date()) {
    return prisma.eventLot.findFirst({
      where: {
        eventId,
        startsAt: { lte: referenceDate },
        OR: [{ endsAt: null }, { endsAt: { gte: referenceDate } }]
      },
      orderBy: { startsAt: "desc" }
    });
  }

  resolveActiveFromList<T extends { startsAt: Date; endsAt: Date | null }>(
    lots: T[],
    referenceDate = new Date()
  ) {
    return lots
      .filter((lot) => lot.startsAt <= referenceDate && (!lot.endsAt || lot.endsAt >= referenceDate))
      .sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime())[0] ?? null;
  }
}

export const eventLotService = new EventLotService();
