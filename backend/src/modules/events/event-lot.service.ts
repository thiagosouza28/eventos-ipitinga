import { prisma } from "../../lib/prisma";
import { AppError, ConflictError, NotFoundError } from "../../utils/errors";
import { invalidatePublicEventCache } from "./event-cache";

type ActorUser = {
  id?: string | null;
  role?: string | null;
};

type LotType = "PADRAO" | "PROMOCIONAL";
type LotStatus = "ATIVO" | "INATIVO" | "ENCERRADO";

type LotInput = {
  name: string;
  priceCents: number;
  startsAt: Date;
  endsAt?: Date | null;
  type?: LotType;
};

const DEFAULT_LOT_TYPE: LotType = "PADRAO";
const PROMOTIONAL_LOT_TYPE: LotType = "PROMOCIONAL";

const normalizeRange = (
  startsAt: Date,
  endsAt?: Date | null,
  options?: { requireEnd?: boolean }
) => {
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
  if (options?.requireEnd && !end) {
    throw new AppError("Data final obrigatoria para lote promocional", 400);
  }
  return { start, end };
};

const ensureNoOverlap = async (
  eventId: string,
  range: { start: Date; end: Date | null },
  type: LotType,
  ignoreId?: string
) => {
  const overlap = await prisma.eventLot.findFirst({
    where: {
      eventId,
      id: ignoreId ? { not: ignoreId } : undefined,
      type,
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

const resolveLotType = (value?: string | null): LotType =>
  value === PROMOTIONAL_LOT_TYPE ? PROMOTIONAL_LOT_TYPE : DEFAULT_LOT_TYPE;

const resolveLotStatus = (value?: string | null): LotStatus | null => {
  switch (value) {
    case "ATIVO":
    case "INATIVO":
    case "ENCERRADO":
      return value;
    default:
      return null;
  }
};

const isLotClosed = (
  lot: { status?: string | null; endsAt?: Date | null },
  referenceDate: Date
) => {
  if (resolveLotStatus(lot.status) === "ENCERRADO") {
    return true;
  }
  return Boolean(lot.endsAt && lot.endsAt < referenceDate);
};

const isLotEligible = (
  lot: { type?: string | null; startsAt: Date; endsAt?: Date | null; status?: string | null },
  referenceDate: Date
) => {
  const type = resolveLotType(lot.type);
  if (type === PROMOTIONAL_LOT_TYPE && !lot.endsAt) {
    return false;
  }
  if (isLotClosed(lot, referenceDate)) {
    return false;
  }
  return lot.startsAt <= referenceDate && (!lot.endsAt || lot.endsAt >= referenceDate);
};

const pickLatestByStart = <T extends { startsAt: Date }>(lots: T[]) => {
  let selected: T | null = null;
  for (const lot of lots) {
    if (!selected || lot.startsAt > selected.startsAt) {
      selected = lot;
    }
  }
  return selected;
};

const resolveActiveLotFromList = <T extends { type?: string | null; status?: string | null; startsAt: Date; endsAt?: Date | null }>(
  lots: T[],
  referenceDate: Date
) => {
  const eligible = lots.filter((lot) => isLotEligible(lot, referenceDate));
  const promotional = eligible.filter((lot) => resolveLotType(lot.type) === PROMOTIONAL_LOT_TYPE);
  if (promotional.length) {
    return pickLatestByStart(promotional);
  }
  return pickLatestByStart(
    eligible.filter((lot) => resolveLotType(lot.type) === DEFAULT_LOT_TYPE)
  );
};

const syncEventLotStatuses = async (
  eventId: string,
  referenceDate: Date,
  options?: { invalidateCache?: boolean }
) => {
  const lots = await prisma.eventLot.findMany({
    where: { eventId },
    orderBy: { startsAt: "asc" }
  });
  if (!lots.length) {
    return { lots: [], activeLot: null, updated: false };
  }

  const activeLot = resolveActiveLotFromList(lots, referenceDate);
  const updates: Array<ReturnType<typeof prisma.eventLot.update>> = [];
  const updatedLots = lots.map((lot) => {
    const isPromo = resolveLotType(lot.type) === PROMOTIONAL_LOT_TYPE;
    const invalidPromo = isPromo && !lot.endsAt;
    let nextStatus: LotStatus;

    if (resolveLotStatus(lot.status) === "ENCERRADO") {
      nextStatus = "ENCERRADO";
    } else if (lot.endsAt && lot.endsAt < referenceDate) {
      nextStatus = "ENCERRADO";
    } else if (invalidPromo) {
      nextStatus = "INATIVO";
    } else if (activeLot && lot.id === activeLot.id) {
      nextStatus = "ATIVO";
    } else {
      nextStatus = "INATIVO";
    }

    if (lot.status !== nextStatus) {
      updates.push(
        prisma.eventLot.update({
          where: { id: lot.id },
          data: { status: nextStatus }
        })
      );
      return { ...lot, status: nextStatus };
    }
    return lot;
  });

  if (updates.length) {
    await prisma.$transaction(updates);
    if (options?.invalidateCache ?? true) {
      invalidatePublicEventCache({ clearAll: true });
    }
    return { lots: updatedLots, activeLot, updated: true };
  }

  return { lots: updatedLots, activeLot, updated: false };
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

  async list(eventId: string) {
    const { lots } = await syncEventLotStatuses(eventId, new Date());
    return lots;
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
    const type = resolveLotType(input.type);
    const range = normalizeRange(input.startsAt, input.endsAt, {
      requireEnd: type === PROMOTIONAL_LOT_TYPE
    });
    await ensureNoOverlap(eventId, range, type);

    const lot = await prisma.eventLot.create({
      data: {
        eventId,
        name: input.name.trim(),
        priceCents: input.priceCents,
        type,
        status: "INATIVO",
        startsAt: range.start,
        endsAt: range.end
      }
    });
    const now = new Date();
    const { lots } = await syncEventLotStatuses(eventId, now, { invalidateCache: false });
    invalidatePublicEventCache({ clearAll: true });
    return lots.find((item) => item.id === lot.id) ?? lot;
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
    if (resolveLotStatus(lot.status) === "ENCERRADO") {
      throw new AppError("Lote encerrado nao pode ser atualizado", 400);
    }

    const isFree = Boolean((lot.event as any)?.isFree);
    if (isFree) {
      throw new AppError("Eventos gratuitos nao aceitam cadastro de lotes", 400);
    }

    let startsAt = lot.startsAt;
    let endsAt: Date | null = lot.endsAt;
    const nextType = resolveLotType(data.type ?? lot.type);

    if (data.startsAt !== undefined || data.endsAt !== undefined || data.type !== undefined) {
      const normalized = normalizeRange(
        data.startsAt ?? lot.startsAt,
        data.endsAt === undefined ? lot.endsAt : data.endsAt,
        { requireEnd: nextType === PROMOTIONAL_LOT_TYPE }
      );
      startsAt = normalized.start;
      endsAt = normalized.end ?? null;
      await ensureNoOverlap(lot.eventId, { start: startsAt, end: endsAt }, nextType, lotId);
    }
    if (nextType === PROMOTIONAL_LOT_TYPE && !endsAt) {
      throw new AppError("Data final obrigatoria para lote promocional", 400);
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
        type: nextType,
        startsAt,
        endsAt
      }
    });
    const now = new Date();
    const { lots } = await syncEventLotStatuses(updated.eventId, now, { invalidateCache: false });
    invalidatePublicEventCache({ clearAll: true });
    return lots.find((item) => item.id === updated.id) ?? updated;
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
    invalidatePublicEventCache({ clearAll: true });
  }

  async findActive(eventId: string, referenceDate = new Date()) {
    const { activeLot } = await syncEventLotStatuses(eventId, referenceDate);
    return activeLot ?? null;
  }

  resolveActiveFromList<T extends { startsAt: Date; endsAt: Date | null }>(
    lots: T[],
    referenceDate = new Date()
  ) {
    return resolveActiveLotFromList(lots, referenceDate) ?? null;
  }
}

export const eventLotService = new EventLotService();
