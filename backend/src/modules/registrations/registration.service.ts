import { promises as fs } from "fs";
import path from "path";

import type { Prisma } from "@/prisma/generated/client";
import { prisma } from "../../lib/prisma";
import { AppError, ConflictError, NotFoundError } from "../../utils/errors";
import { calculateAge } from "../../utils/cpf";
import { auditService } from "../../services/audit.service";
import { generateReceiptPdf } from "../../pdf/receipt.service";
import { signReceiptToken, verifyReceiptToken } from "../../utils/hmac";
import { env } from "../../config/env";
import { OrderStatus, RegistrationStatus, type RegistrationStatus as RegistrationStatusValue } from "../../config/statuses";
import { maskCpf, sanitizeCpf } from "../../utils/mask";
import {
  generateRegistrationReportPdf,
  RegistrationReportGroup,
  generateRegistrationEventSheetPdf,
  EventSheetParticipant
} from "../../pdf/registration-report.service";
import { DEFAULT_PHOTO_DATA_URL } from "../../config/default-photo";
import { PaymentMethod, PAYMENT_METHOD_LABELS } from "../../config/payment-methods";
import { Gender, parseGender } from "../../config/gender";
import { storageService } from "../../storage/storage.service";
import { orderService } from "../orders/order.service";
import { resolveOrderExpirationDate } from "../../utils/order-expiration";

const receiptsDir = path.resolve(__dirname, "..", "..", "tmp", "receipts");

const brDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  year: "numeric"
});

const brDateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  dateStyle: "short",
  timeStyle: "short"
});

const toPublicPhotoUrl = (value?: string | null) => {
  if (!value) return undefined;
  if (/^data:/i.test(value) || /^https?:\/\//i.test(value)) {
    return value;
  }
  const sanitized = value.replace(/^\/+/, "");
  if (!sanitized) return undefined;
  const base = env.APP_URL.replace(/\/$/, "");
  if (sanitized.startsWith("uploads/")) {
    return `${base}/${sanitized}`;
  }
  return `${base}/uploads/${sanitized}`;
};

// FormataÃ§Ã£o de data sem timezone (para datas de nascimento)
const brDateFormatterNoTimezone = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric"
});

const formatDateBr = (date: Date | null | undefined) =>
  date ? brDateFormatter.format(date) : "NÃ£o informado";

// FormataÃ§Ã£o de data de nascimento usando componentes UTC diretamente
// Isso garante que a data exibida seja exatamente a data UTC salva no banco,
// sem conversÃ£o de timezone que pode causar mudanÃ§a de dia
const formatBirthDateBr = (date: Date | null | undefined) => {
  if (!date) return "NÃ£o informado";
  
  // Extrair componentes UTC diretamente da data
  // Quando a data Ã© salva como "1998-11-05T00:00:00.000Z", queremos exibir "05/11/1998"
  // Usando UTC garantimos que nÃ£o haverÃ¡ mudanÃ§a de dia por causa do fuso horÃ¡rio
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = date.getUTCFullYear();
  
  return `${day}/${month}/${year}`;
};

const buildReceiptLink = (registrationId: string, storedUrl?: string | null) => {
  let baseUrl: URL;
  try {
    if (storedUrl) {
      baseUrl = new URL(storedUrl, env.APP_URL);
      baseUrl.search = "";
    } else {
      baseUrl = new URL(`/api/receipts/${registrationId}.pdf`, env.APP_URL);
    }
  } catch {
    baseUrl = new URL(`/api/receipts/${registrationId}.pdf`, env.APP_URL);
  }

  const token = signReceiptToken(registrationId);
  baseUrl.searchParams.set("token", token);

  return {
    token,
    url: baseUrl.toString(),
    baseUrl: `${baseUrl.origin}${baseUrl.pathname}`
  };
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: "Pendente",
  PAID: "Pago",
  CANCELED: "Cancelada",
  REFUNDED: "Estornada",
  CHECKED_IN: "Check-in realizado",
  DRAFT: "Rascunho"
};

const resolvePaymentStatusLabel = (status: string) =>
  PAYMENT_STATUS_LABELS[status] ?? status;

const REGISTRATION_STATUSES = [
  "DRAFT",
  "PENDING_PAYMENT",
  "PAID",
  "CANCELED",
  "REFUNDED",
  "CHECKED_IN"
] as const;

const ACTIVE_REGISTRATION_STATUSES: RegistrationStatusValue[] = [
  "DRAFT",
  "PENDING_PAYMENT",
  "PAID",
  "CHECKED_IN"
];

type RegistrationFilters = {
  eventId?: string;
  districtId?: string;
  churchId?: string;
  status?: RegistrationStatusValue;
};

const buildRegistrationWhere = (filters: RegistrationFilters = {}, ministryIds?: string[]) => ({
  eventId: filters.eventId,
  districtId: filters.districtId,
  churchId: filters.churchId,
  status: filters.status,
  ...(ministryIds && ministryIds.length ? { ministryId: { in: ministryIds } } : {})
});

export class RegistrationService {
  findById(id: string) {
    return prisma.registration.findUnique({
      where: { id },
      include: {
        order: true,
        event: true,
        district: true,
        church: true
      }
    });
  }

  async ensureUniqueCpf(eventId: string, cpf: string) {
    const sanitizedCpf = sanitizeCpf(cpf);
    const exists = await prisma.registration.findFirst({
      where: {
        eventId,
        cpf: sanitizedCpf,
        status: { in: ACTIVE_REGISTRATION_STATUSES }
      }
    });
    if (exists) {
      throw new ConflictError(`CPF ${maskCpf(sanitizedCpf)} jÃ¡ possui inscriÃ§Ã£o para este evento. NÃ£o Ã© possÃ­vel fazer mais de uma inscriÃ§Ã£o com o mesmo CPF no mesmo evento.`);
    }
  }

  async isCpfRegistered(eventId: string, cpf: string) {
    const sanitizedCpf = sanitizeCpf(cpf);
    const exists = await prisma.registration.findFirst({
      where: {
        eventId,
        cpf: sanitizedCpf,
        status: { in: ACTIVE_REGISTRATION_STATUSES }
      }
    });
    return Boolean(exists);
  }

  async getLatestProfileByCpf(cpf: string) {
    const sanitizedCpf = sanitizeCpf(cpf);
    const registration = await prisma.registration.findFirst({
      where: { cpf: sanitizedCpf },
      include: {
        district: true,
        church: true
      },
      orderBy: { createdAt: "desc" }
    });
    if (!registration) {
      return null;
    }
    const birthDateIso = registration.birthDate.toISOString().slice(0, 10);
    return {
      fullName: registration.fullName,
      birthDate: birthDateIso,
      gender: parseGender(registration.gender ?? undefined),
      districtId: registration.districtId,
      churchId: registration.churchId,
      photoUrl: toPublicPhotoUrl(registration.photoUrl)
    };
  }

  async list(filters: RegistrationFilters, ministryIds?: string[]) {
    return prisma.registration.findMany({
      where: buildRegistrationWhere(filters, ministryIds),
      select: {
        id: true,
        orderId: true,
        eventId: true,
        fullName: true,
        cpf: true,
        birthDate: true,
        ageYears: true,
        priceCents: true,
        districtId: true,
        churchId: true,
        photoUrl: true,
        gender: true,
        paymentMethod: true,
        status: true,
        receiptPdfUrl: true,
        checkinAt: true,
        paidAt: true,
        createdAt: true,
        event: {
          select: {
            id: true,
            title: true,
            slug: true,
            startDate: true,
            endDate: true,
            location: true,
            priceCents: true,
            isFree: true
          }
        },
        order: {
          select: {
            id: true,
            totalCents: true,
            status: true,
            paymentMethod: true,
            mpPaymentId: true,
            paidAt: true,
            createdAt: true,
            expiresAt: true,
            buyerCpf: true
          }
        },
        district: {
          select: {
            id: true,
            name: true
          }
        },
        church: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });
  }

  async report(filters: RegistrationFilters, groupBy: "event" | "church", ministryIds?: string[]) {
    const where = buildRegistrationWhere(filters, ministryIds);
    if (groupBy === "event") {
      const grouped = await prisma.registration.groupBy({
        by: ["eventId", "status"],
        where,
        _count: true
      });
      const eventIds = Array.from(
        new Set(grouped.map((item) => item.eventId).filter((id): id is string => Boolean(id)))
      );
      const events = await prisma.event.findMany({
        where: { id: { in: eventIds } },
        select: { id: true, title: true, startDate: true, endDate: true }
      });
      const eventMap = new Map(events.map((event) => [event.id, event]));

      const resultMap = new Map<
        string | "UNKNOWN",
        {
          id: string | null;
          name: string;
          period: string;
          totals: Record<typeof REGISTRATION_STATUSES[number] | "total", number>;
        }
      >();

      const ensureEntry = (key: string | null) => {
        const idKey = key ?? "UNKNOWN";
        if (!resultMap.has(idKey)) {
          const event = key ? eventMap.get(key) : null;
          const period =
            event && event.startDate && event.endDate
              ? `${formatDateBr(event.startDate)} - ${formatDateBr(event.endDate)}`
              : "NÃ£o informado";
          resultMap.set(idKey, {
            id: key,
            name: event?.title ?? "NÃ£o informado",
            period,
            totals: REGISTRATION_STATUSES.reduce(
              (acc, status) => Object.assign(acc, { [status]: 0 }),
              { total: 0 } as Record<typeof REGISTRATION_STATUSES[number] | "total", number>
            )
          });
        }
        return resultMap.get(idKey)!;
      };

      grouped.forEach((item) => {
        const entry = ensureEntry(item.eventId);
        entry.totals.total += item._count;
        entry.totals[item.status as (typeof REGISTRATION_STATUSES)[number]] = item._count;
      });

      return {
        groupBy,
        items: Array.from(resultMap.values()).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
      };
    }

    const grouped = await prisma.registration.groupBy({
      by: ["churchId", "status"],
      where,
      _count: true
    });
    const churchIds = Array.from(
      new Set(grouped.map((item) => item.churchId).filter((id): id is string => Boolean(id)))
    );
    const churches = await prisma.church.findMany({
      where: { id: { in: churchIds } },
      include: { district: true }
    });
    const churchMap = new Map(churches.map((church) => [church.id, church]));

    const resultMap = new Map<
      string | "UNKNOWN",
      {
        id: string | null;
        name: string;
        districtName: string;
        totals: Record<typeof REGISTRATION_STATUSES[number] | "total", number>;
      }
    >();

    const ensureEntry = (key: string | null) => {
      const idKey = key ?? "UNKNOWN";
      if (!resultMap.has(idKey)) {
        const church = key ? churchMap.get(key) : null;
        resultMap.set(idKey, {
          id: key,
          name: church?.name ?? "NÃ£o informado",
          districtName: church?.district?.name ?? "NÃ£o informado",
          totals: REGISTRATION_STATUSES.reduce(
            (acc, status) => Object.assign(acc, { [status]: 0 }),
            { total: 0 } as Record<typeof REGISTRATION_STATUSES[number] | "total", number>
          )
        });
      }
      return resultMap.get(idKey)!;
    };

    grouped.forEach((item) => {
      const entry = ensureEntry(item.churchId);
      entry.totals.total += item._count;
      entry.totals[item.status as (typeof REGISTRATION_STATUSES)[number]] = item._count;
    });

    return {
      groupBy,
      items: Array.from(resultMap.values()).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
    };
  }

  async update(
    id: string,
    data: {
      districtId?: string;
      churchId?: string;
      fullName?: string;
      birthDate?: string;
      cpf?: string;
      gender?: Gender;
      photoUrl?: string | null;
    },
    actorId?: string
  ) {
    const registration = await prisma.registration.findUnique({ where: { id } });
    if (!registration) throw new NotFoundError("Inscricao nao encontrada");

    const payload: Prisma.RegistrationUpdateInput = {};

    if (data.fullName !== undefined) {
      payload.fullName = data.fullName.trim().toUpperCase();
    }
    if (data.districtId) {
      payload.district = { connect: { id: data.districtId } };
    }
    if (data.churchId) {
      payload.church = { connect: { id: data.churchId } };
    }
    if (data.birthDate) {
      const ageYears = this.computeAge(data.birthDate);
      // Garantir que a data seja salva como UTC midnight do dia correto
      const birthDateParts = data.birthDate.split('-');
      payload.birthDate = new Date(Date.UTC(
        parseInt(birthDateParts[0], 10), // ano
        parseInt(birthDateParts[1], 10) - 1, // mÃªs (0-indexed)
        parseInt(birthDateParts[2], 10) // dia
      ));
      payload.ageYears = ageYears;
    }
    if (data.cpf) {
      const sanitized = sanitizeCpf(data.cpf);
      if (sanitized !== registration.cpf) {
        const exists = await prisma.registration.findFirst({
          where: {
            eventId: registration.eventId,
            cpf: sanitized,
            status: { in: ACTIVE_REGISTRATION_STATUSES }
          }
        });
        if (exists) {
          throw new ConflictError(`CPF ${maskCpf(sanitized)} ja possui inscricao para este evento`);
        }
        payload.cpf = sanitized;
      }
    }
    if (data.gender) {
      payload.gender = parseGender(data.gender);
    }
    let newPhotoUrl: string | null | undefined = undefined;
    const previousPhotoUrl = registration.photoUrl ?? null;
    if (data.photoUrl !== undefined) {
      newPhotoUrl = data.photoUrl
        ? await storageService.saveBase64Image(data.photoUrl)
        : null;
      payload.photoUrl = newPhotoUrl;
    }

    if (Object.keys(payload).length === 0) {
      return registration;
    }

    const updated = await prisma.registration.update({
      where: { id },
      data: payload
    });
    // Se atualizamos a foto e a URL mudou, tentar remover a anterior do storage
    if (newPhotoUrl !== undefined && previousPhotoUrl && newPhotoUrl !== previousPhotoUrl) {
      await storageService.deleteByUrl(previousPhotoUrl).catch(() => undefined);
    }
    await auditService.log({
      actorUserId: actorId,
      action: "REGISTRATION_UPDATED",
      entity: "registration",
      entityId: id,
      metadata: payload
    });
    return updated;
  }

  async cancel(id: string) {
    const registration = await prisma.registration.findUnique({
      where: { id },
      include: { order: true }
    });
    if (!registration) throw new NotFoundError("Inscricao nao encontrada");
    if (registration.status === "PAID") {
      throw new AppError("NÃ£o Ã© possÃ­vel cancelar inscriÃ§Ã£o paga (solicite estorno)", 400);
    }
    await prisma.registration.update({
      where: { id },
      data: { status: "CANCELED" }
    });

    const remaining = await prisma.registration.count({
      where: {
        orderId: registration.orderId,
        status: { in: ACTIVE_REGISTRATION_STATUSES }
      }
    });

    if (remaining === 0) {
      await prisma.order.update({
        where: { id: registration.orderId },
        data: { status: "CANCELED" }
      });
    }

    await auditService.log({
      action: "REGISTRATION_CANCELED",
      entity: "registration",
      entityId: id,
      metadata: { orderId: registration.orderId }
    });
  }

  async reactivate(id: string, actorId?: string) {
    const registration = await prisma.registration.findUnique({
      where: { id },
      include: {
        order: true,
        event: true
      }
    });
    if (!registration) {
      throw new NotFoundError("Inscricao nao encontrada");
    }
    if (registration.status !== RegistrationStatus.CANCELED) {
      throw new AppError("Somente inscricoes canceladas podem ser reativadas", 400);
    }
    if (!registration.orderId || !registration.order) {
      throw new AppError("Inscricao sem pedido associado", 400);
    }

    const expiresAt = resolveOrderExpirationDate(registration.order.paymentMethod as PaymentMethod);

    await prisma.$transaction(async (tx) => {
      await tx.registration.update({
        where: { id },
        data: {
          status: RegistrationStatus.PENDING_PAYMENT,
          paidAt: null
        }
      });
      await tx.order.update({
        where: { id: registration.orderId },
        data: {
          status: OrderStatus.PENDING,
          expiresAt,
          paidAt: null,
          mpPaymentId: null,
          mpPreferenceId: null
        }
      });
    });

    await auditService.log({
      action: "REGISTRATION_REACTIVATED",
      entity: "registration",
      entityId: id,
      actorUserId: actorId,
      metadata: { orderId: registration.orderId }
    });

    return orderService.createIndividualPaymentForRegistration(id);
  }

  async delete(id: string) {
    const registration = await prisma.registration.findUnique({
      where: { id },
      include: { order: true, refunds: true, event: true }
    });
    if (!registration) throw new NotFoundError("Inscricao nao encontrada");

    await prisma.$transaction(async (tx) => {
      if (registration.refunds.length > 0) {
        await tx.refund.deleteMany({ where: { registrationId: id } });
      }

      await tx.registration.delete({ where: { id } });

      const remainingRegistrations = await tx.registration.findMany({
        where: { orderId: registration.orderId }
      });

      const updatedTotalCents = remainingRegistrations.reduce((sum, current) => {
        const price = current.priceCents ?? registration.event?.priceCents ?? 0;
        return sum + price;
      }, 0);

      const orderUpdate: Record<string, unknown> = {
        totalCents: updatedTotalCents
      };

      if (remainingRegistrations.length === 0 && registration.order.status !== "PAID") {
        orderUpdate.status = "CANCELED";
      }

      await tx.order.update({
        where: { id: registration.orderId },
        data: orderUpdate
      });
    });

    await auditService.log({
      action: "REGISTRATION_DELETED",
      entity: "registration",
      entityId: id,
      metadata: { orderId: registration.orderId }
    });
  }

  async markCheckin(id: string, actorId?: string) {
    const registration = await prisma.registration.findUnique({ where: { id } });
    if (!registration) throw new NotFoundError("Inscricao nao encontrada");
    if (registration.status !== "PAID") {
      throw new AppError("Apenas inscricoes pagas podem realizar check-in", 400);
    }
    const updated = await prisma.registration.update({
      where: { id },
      data: {
        status: "CHECKED_IN",
        checkinAt: new Date()
      }
    });
    await auditService.log({
      actorUserId: actorId,
      action: "CHECKIN_COMPLETED",
      entity: "registration",
      entityId: id
    });
    return updated;
  }

  async generateReceipt(registrationId: string) {
    const registration = await prisma.registration.findUnique({
      where: { id: registrationId },
      include: {
        event: true,
        district: true,
        church: true,
        order: {
          select: {
            totalCents: true,
            feeCents: true,
            pricingLot: { select: { name: true } }
          }
        }
      }
    });
    if (!registration) throw new NotFoundError("Inscricao nao encontrada");

    await fs.mkdir(receiptsDir, { recursive: true });

    const paymentMethod = (registration.paymentMethod as PaymentMethod) ?? PaymentMethod.PIX_MP;
    const paymentStatusLabel = resolvePaymentStatusLabel(registration.status);
    const paymentMethodLabel = PAYMENT_METHOD_LABELS[paymentMethod] ?? paymentMethod;

    const eventTitle = registration.event?.title ?? "Evento";
    const eventLocation = registration.event?.location ?? "Local a definir";
    const eventPeriod = (() => {
      const start = registration.event?.startDate;
      const end = registration.event?.endDate;
      if (start && end) {
        return `${formatDateBr(start)} - ${formatDateBr(end)}`;
      }
      if (start) return formatDateBr(start);
      if (end) return formatDateBr(end);
      return formatDateBr(registration.createdAt);
    })();

    const birthDateLabel = formatBirthDateBr(registration.birthDate);
    const computedAge =
      typeof registration.ageYears === "number" && Number.isFinite(registration.ageYears)
        ? registration.ageYears
        : registration.birthDate
          ? calculateAge(registration.birthDate)
          : 0;
    const districtName = registration.district?.name ?? "Nao informado";
    const churchName = registration.church?.name ?? "Nao informado";
    const paymentDate = registration.paidAt ?? registration.createdAt;

    const { pdfBuffer, validationUrl } = await generateReceiptPdf({
      eventTitle,
      eventLocation,
      eventPeriod,
      fullName: registration.fullName,
      cpf: registration.cpf,
      birthDate: birthDateLabel,
      ageYears: computedAge,
      districtName,
      churchName,
      registrationId: registration.id,
      status: paymentStatusLabel,
      createdAt: registration.createdAt,
      paymentMethod: paymentMethodLabel,
      paymentDate,
      photoUrl: toPublicPhotoUrl(registration.photoUrl) ?? "",
      priceCents: registration.priceCents ?? 0,
      feeCents: registration.order?.feeCents ?? 0,
      totalCents: registration.order?.totalCents ?? registration.priceCents ?? 0,
      lotName: registration.order?.pricingLot?.name ?? "Lote vigente",
      participantType: "Inscrição individual"
    });

    const filePath = path.join(receiptsDir, `${registrationId}.pdf`);
    await fs.writeFile(filePath, pdfBuffer);

    const { token, url: receiptUrl, baseUrl } = buildReceiptLink(registrationId);

    await prisma.registration.update({
      where: { id: registrationId },
      data: { receiptPdfUrl: baseUrl }
    });

    return { filePath, token, validationUrl, receiptUrl };
  }

  async generateReceiptsForOrder(orderId: string) {
    const registrations = await prisma.registration.findMany({
      where: { orderId, status: "PAID" }
    });
    for (const registration of registrations) {
      await this.generateReceipt(registration.id);
    }
  }

  async getReceiptLink(registrationId: string) {
    const registration = await prisma.registration.findUnique({
      where: { id: registrationId },
      select: { status: true, receiptPdfUrl: true }
    });
    if (!registration) {
      throw new NotFoundError("Inscricao nao encontrada");
    }
    if (
      ![RegistrationStatus.PAID, RegistrationStatus.CHECKED_IN, RegistrationStatus.REFUNDED].includes(
        registration.status as RegistrationStatus
      )
    ) {
      throw new AppError("Comprovante disponivel apenas para inscricoes pagas", 400);
    }
    const { url: receiptUrl } = buildReceiptLink(registrationId, registration.receiptPdfUrl);
    return { url: receiptUrl };
  }

  async lookupReceipts(cpf: string, birthDate: string) {
    const sanitizedCpf = sanitizeCpf(cpf);
    const birth = new Date(birthDate);
    const start = new Date(birth);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const person = await prisma.registration.findMany({
      where: {
        cpf: sanitizedCpf,
        birthDate: {
          gte: start,
          lt: end
        },
        status: { in: ["PAID", "CHECKED_IN", "REFUNDED"] }
      },
      include: {
        event: true
      },
      orderBy: { createdAt: "desc" }
    });

    return person.map((registration) => {
      const { url: receiptUrl } = buildReceiptLink(registration.id, registration.receiptPdfUrl);
      return {
        registrationId: registration.id,
        eventTitle: registration.event.title,
        status: registration.status,
        issuedAt: registration.createdAt,
        receiptUrl
      };
    });
  }

  async listReceiptLinksByOrder(orderId: string) {
    const registrations = await prisma.registration.findMany({
      where: {
        orderId,
        status: {
          in: [RegistrationStatus.PAID, RegistrationStatus.CHECKED_IN, RegistrationStatus.REFUNDED]
        }
      },
      select: {
        id: true,
        fullName: true,
        receiptPdfUrl: true
      }
    });

    return registrations.map((registration) => {
      const { url: receiptUrl } = buildReceiptLink(registration.id, registration.receiptPdfUrl);
      return {
        registrationId: registration.id,
        fullName: registration.fullName,
        receiptUrl
      };
    });
  }

  async streamReceipt(registrationId: string, token: string) {
    const registration = await prisma.registration.findUnique({ where: { id: registrationId } });
    if (!registration) throw new NotFoundError("Recibo nao encontrado");

    if (!verifyReceiptToken(registrationId, token)) {
      throw new AppError("Token invalido", 403);
    }

    await this.generateReceipt(registrationId);
    const filePath = path.join(receiptsDir, `${registrationId}.pdf`);
    const buffer = await fs.readFile(filePath);
    return buffer;
  }

  computeAge(birthDate: string) {
    return calculateAge(birthDate);
  }

  async generateReportPdf(filters: RegistrationFilters, groupBy: "event" | "church", ministryIds?: string[]) {
    const registrations = await prisma.registration.findMany({
      where: buildRegistrationWhere(filters, ministryIds),
      include: {
        event: true,
        district: true,
        church: { include: { district: true } }
      },
      orderBy: [
        groupBy === "event"
          ? { event: { title: "asc" } }
          : { church: { name: "asc" } },
        { fullName: "asc" }
      ]
    });

    const groupsMap = new Map<string | "UNKNOWN", RegistrationReportGroup>();

    const ensureGroup = (
      key: string | null,
      params: {
        registrationEventTitle?: string;
        registrationEventPeriod?: string | null;
        registrationEventLocation?: string | null;
        churchName?: string | null;
        districtName?: string | null;
      }
    ) => {
      const mapKey = key ?? "UNKNOWN";
      if (!groupsMap.has(mapKey)) {
        if (groupBy === "event") {
          groupsMap.set(mapKey, {
            id: key,
            title: params.registrationEventTitle ?? "Evento nao informado",
            subtitle: params.registrationEventPeriod ?? null,
            extraInfo: params.registrationEventLocation ?? null,
            participants: []
          });
        } else {
          groupsMap.set(mapKey, {
            id: key,
            title: params.churchName ?? "Igreja nao informada",
            subtitle: params.districtName ? `Distrito: ${params.districtName}` : null,
            participants: [],
            extraInfo: null
          });
        }
      }
      return groupsMap.get(mapKey)!;
    };

    registrations.forEach((registration) => {
      const event = registration.event;
      const church = registration.church;
      const district = registration.district ?? church?.district;

      const key = groupBy === "event" ? registration.eventId : registration.churchId;
      const eventPeriod =
        event && event.startDate && event.endDate
          ? `${formatDateBr(event.startDate)} - ${formatDateBr(event.endDate)}`
          : null;

      const group = ensureGroup(key ?? null, {
        registrationEventTitle: event?.title,
        registrationEventPeriod: eventPeriod,
        registrationEventLocation: event?.location,
        churchName: church?.name ?? null,
        districtName: church?.district?.name ?? district?.name ?? null
      });

      group.participants.push({
        fullName: registration.fullName,
        churchName: church?.name ?? "Nao informado",
        districtName: district?.name ?? "Nao informado",
        birthDate: registration.birthDate
          ? formatDateBr(registration.birthDate)
          : "Nao informado",
        ageYears: registration.ageYears ?? null,
        eventTitle: event?.title ?? "Nao informado",
        status: registration.status
      });
    });

    const groups = Array.from(groupsMap.values()).sort((a, b) =>
      a.title.localeCompare(b.title, "pt-BR")
    );

    const pdfBuffer = await generateRegistrationReportPdf({
      groupBy,
      generatedAt: brDateTimeFormatter.format(new Date()),
      groups
    });

    return pdfBuffer;
  }

  async generateEventSheetPdf(
    filters: RegistrationFilters,
    groupBy: "event" | "church",
    layout: "single" | "two" | "four" = "single",
    ministryIds?: string[]
  ) {
    const registrations = await prisma.registration.findMany({
      where: buildRegistrationWhere(filters, ministryIds),
      include: {
        event: true,
        district: true,
        church: { include: { district: true } }
      },
      orderBy: [
        groupBy === "event" ? { event: { title: "asc" } } : { church: { name: "asc" } },
        { fullName: "asc" }
      ]
    });

    const participants: EventSheetParticipant[] = registrations.map((r) => {
      const event = r.event;
      const church = r.church;
      const district = r.district ?? church?.district;

      const birthDateBr = r.birthDate ? formatBirthDateBr(r.birthDate) : "Nao informado";
      let age: number | null = r.ageYears ?? null;
      if (age == null && r.birthDate) {
        try { age = this.computeAge(r.birthDate.toISOString().slice(0, 10)); } catch {}
      }

      return {
        fullName: r.fullName,
        birthDate: birthDateBr,
        ageYears: age,
        churchName: church?.name ?? "Nao informado",
        districtName: district?.name ?? "Nao informado",
        photoUrl: toPublicPhotoUrl(r.photoUrl) ?? DEFAULT_PHOTO_DATA_URL,
        eventTitle: event?.title ?? undefined
      };
    });

    // Tentar compor um título de contexto (ex.: por evento ou por igreja)
    let contextTitle: string | null = null;
    if (groupBy === "event") {
      const uniqueEvent = Array.from(new Set(registrations.map((r) => r.event?.title).filter(Boolean)));
      contextTitle = uniqueEvent.length === 1 ? `Evento: ${uniqueEvent[0]}` : null;
    } else {
      const uniqueChurch = Array.from(new Set(registrations.map((r) => r.church?.name).filter(Boolean)));
      const uniqueDistrict = Array.from(new Set((registrations.map((r) => r.district?.name ?? r.church?.district?.name).filter(Boolean)) as string[]));
      if (uniqueChurch.length === 1 && uniqueDistrict.length === 1) {
        contextTitle = `Distrito: ${uniqueDistrict[0]} · Igreja: ${uniqueChurch[0]}`;
      }
    }

    const resolvedLayout = layout === "four" ? "two" : layout;

    const pdfBuffer = await generateRegistrationEventSheetPdf({
      generatedAt: brDateTimeFormatter.format(new Date()),
      context: { title: contextTitle, footerText: contextTitle ?? undefined },
      participants,
      layout: resolvedLayout
    });

    return pdfBuffer;
  }

  /**
   * Retorna histórico consolidado da inscrição (auditoria, pagamentos, estornos, etc.)
   */
  async getHistory(registrationId: string) {
    const registration = await prisma.registration.findUnique({
      where: { id: registrationId },
      include: { order: true }
    });
    if (!registration) throw new NotFoundError("Inscricao nao encontrada");

    const orderId = registration.orderId;

    const [logs, refunds] = await Promise.all([
      prisma.auditLog.findMany({
        where: {
          OR: [
            { entity: "registration", entityId: registrationId },
            orderId ? { entity: "order", entityId: orderId } : undefined
          ].filter(Boolean) as any
        },
        orderBy: { createdAt: "asc" }
      }) as any,
      prisma.refund.findMany({
        where: { registrationId: registrationId },
        orderBy: { createdAt: "asc" }
      })
    ]);

    const events: Array<{
      type: string;
      at: Date;
      label?: string;
      actor?: { id: string; name?: string | null; email?: string | null; role?: string | null } | null;
      details?: Record<string, unknown>;
    }> = [];

    // Criação da inscrição
    events.push({ type: "REGISTRATION_CREATED", at: registration.createdAt, label: "Inscrição criada" });

    // Método de pagamento selecionado (se existir)
    const initialMethod = (registration.paymentMethod as any) || (registration.order as any)?.paymentMethod || null;
    if (initialMethod) {
      events.push({ type: "PAYMENT_METHOD_SELECTED", at: registration.createdAt, label: `Forma de pagamento escolhida`, details: { paymentMethod: initialMethod } });
    }

    // Pagamento confirmado na inscrição
    if (registration.paidAt) {
      events.push({ type: "PAYMENT_CONFIRMED", at: registration.paidAt, label: "Pagamento confirmado", details: { paymentMethod: (registration.paymentMethod as any) ?? (registration.order as any)?.paymentMethod } });
    }

    // Logs de auditoria
    for (const log of logs) {
      let metadata: any = undefined;
      try { metadata = log.metadataJson ? JSON.parse(log.metadataJson) : undefined } catch {}
      const action = String(log.action);
      const labelMap: Record<string, string> = {
        ORDER_CREATED: "Pedido criado",
        ORDER_PAID: "Pedido pago",
        REGISTRATION_UPDATED: "Inscrição atualizada",
        REGISTRATION_CANCELED: "Inscrição cancelada",
        REGISTRATION_DELETED: "Inscrição excluída",
        REGISTRATION_REFUNDED: "Estorno realizado"
      };
      events.push({
        type: action,
        at: log.createdAt,
        label: labelMap[action] ?? undefined,
        actor: log.actorUserId ? { id: log.actorUserId } : null,
        details: metadata
      });
    }

    // Estornos
    for (const ref of refunds) {
      events.push({
        type: "PAYMENT_REFUNDED",
        at: ref.createdAt,
        label: "Estorno realizado",
        details: { amountCents: ref.amountCents, reason: ref.reason, mpRefundId: ref.mpRefundId }
      });
    }

    // Ordenar e retornar
    events.sort((a, b) => a.at.getTime() - b.at.getTime());
    return {
      registration: {
        id: registration.id,
        status: registration.status,
        paymentMethod: registration.paymentMethod,
        paidAt: registration.paidAt,
        createdAt: registration.createdAt
      },
      orderId,
      events
    };
  }
}

export const registrationService = new RegistrationService();

