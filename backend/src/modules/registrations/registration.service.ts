import { promises as fs } from "fs";
import path from "path";

import type { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError, ConflictError, NotFoundError } from "../../utils/errors";
import { calculateAge } from "../../utils/cpf";
import { auditService } from "../../services/audit.service";
import { generateReceiptPdf } from "../../pdf/receipt.service";
import { signReceiptToken, verifyReceiptToken } from "../../utils/hmac";
import { env } from "../../config/env";
import type { RegistrationStatus as RegistrationStatusValue } from "../../config/statuses";
import { maskCpf, sanitizeCpf } from "../../utils/mask";
import {
  generateRegistrationReportPdf,
  RegistrationReportGroup
} from "../../pdf/registration-report.service";
import { DEFAULT_PHOTO_DATA_URL } from "../../config/default-photo";
import { PaymentMethod, PAYMENT_METHOD_LABELS } from "../../config/payment-methods";
import { Gender, parseGender } from "../../config/gender";
import { storageService } from "../../storage/storage.service";

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

const formatDateBr = (date: Date | null | undefined) =>
  date ? brDateFormatter.format(date) : "Não informado";

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

const resolvePhotoUrl = (photoUrl: string | null | undefined) =>
  photoUrl && photoUrl.trim().length > 0 ? photoUrl : DEFAULT_PHOTO_DATA_URL;

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

type RegistrationFilters = {
  eventId?: string;
  districtId?: string;
  churchId?: string;
  status?: RegistrationStatusValue;
};

const buildRegistrationWhere = (filters: RegistrationFilters = {}) => ({
  eventId: filters.eventId,
  districtId: filters.districtId,
  churchId: filters.churchId,
  status: filters.status
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
      where: { eventId, cpf: sanitizedCpf, status: { notIn: ["REFUNDED", "CANCELED"] } }
    });
    if (exists) {
      throw new ConflictError(`CPF ${maskCpf(sanitizedCpf)} já possui inscrição para este evento. Não é possível fazer mais de uma inscrição com o mesmo CPF no mesmo evento.`);
    }
  }

  async isCpfRegistered(eventId: string, cpf: string) {
    const sanitizedCpf = sanitizeCpf(cpf);
    const exists = await prisma.registration.findFirst({
      where: { eventId, cpf: sanitizedCpf, status: { notIn: ["REFUNDED", "CANCELED"] } }
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
      photoUrl: resolvePhotoUrl(registration.photoUrl)
    };
  }

  async list(filters: RegistrationFilters) {
    return prisma.registration.findMany({
      where: buildRegistrationWhere(filters),
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

  async report(filters: RegistrationFilters, groupBy: "event" | "church") {
    const where = buildRegistrationWhere(filters);
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
              : "Não informado";
          resultMap.set(idKey, {
            id: key,
            name: event?.title ?? "Não informado",
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
          name: church?.name ?? "Não informado",
          districtName: church?.district?.name ?? "Não informado",
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
      gender?: Gender;
      photoUrl?: string | null;
    }
  ) {
    const registration = await prisma.registration.findUnique({ where: { id } });
    if (!registration) throw new NotFoundError("Inscricao nao encontrada");

    const payload: Prisma.RegistrationUpdateInput = {};

    if (data.fullName !== undefined) {
      payload.fullName = data.fullName;
    }
    if (data.districtId) {
      payload.district = { connect: { id: data.districtId } };
    }
    if (data.churchId) {
      payload.church = { connect: { id: data.churchId } };
    }
    if (data.birthDate) {
      const ageYears = this.computeAge(data.birthDate);
      payload.birthDate = new Date(data.birthDate);
      payload.ageYears = ageYears;
    }
    if (data.gender) {
      payload.gender = parseGender(data.gender);
    }
    if (data.photoUrl !== undefined) {
      payload.photoUrl = data.photoUrl
        ? await storageService.saveBase64Image(data.photoUrl)
        : null;
    }

    if (Object.keys(payload).length === 0) {
      return registration;
    }

    const updated = await prisma.registration.update({
      where: { id },
      data: payload
    });
    await auditService.log({
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
      throw new AppError("Não é possível cancelar inscrição paga (solicite estorno)", 400);
    }
    await prisma.registration.update({
      where: { id },
      data: { status: "CANCELED" }
    });

    const remaining = await prisma.registration.count({
      where: {
        orderId: registration.orderId,
        status: { notIn: ["CANCELED", "REFUNDED"] }
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
        church: true
      }
    });
    if (!registration) throw new NotFoundError("Inscricao nao encontrada");

    await fs.mkdir(receiptsDir, { recursive: true });

    const paymentMethod = (registration.paymentMethod as PaymentMethod) ?? PaymentMethod.PIX_MP;
    const paymentStatusLabel = resolvePaymentStatusLabel(registration.status);
    const paymentMethodLabel = PAYMENT_METHOD_LABELS[paymentMethod] ?? paymentMethod;

    const { pdfBuffer, validationUrl } = await generateReceiptPdf({
      eventTitle: registration.event.title,
      eventLocation: registration.event.location,
      eventPeriod: `${formatDateBr(registration.event.startDate)} - ${formatDateBr(registration.event.endDate)}`,
      fullName: registration.fullName,
      cpf: registration.cpf,
      birthDate: formatDateBr(registration.birthDate),
      ageYears: registration.ageYears,
      districtName: registration.district.name,
      churchName: registration.church.name,
      registrationId: registration.id,
      status: paymentStatusLabel,
      createdAt: registration.createdAt,
      paymentMethod: paymentMethodLabel,
      paymentDate: registration.paidAt ?? registration.createdAt,
      photoUrl: resolvePhotoUrl(registration.photoUrl)
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

  async streamReceipt(registrationId: string, token: string) {
    const registration = await prisma.registration.findUnique({ where: { id: registrationId } });
    if (!registration) throw new NotFoundError("Recibo nao encontrado");

    if (!verifyReceiptToken(registrationId, token)) {
      throw new AppError("Token invalido", 403);
    }

    const filePath = path.join(receiptsDir, `${registrationId}.pdf`);
    const exists = await fs
      .access(filePath)
      .then(() => true)
      .catch(() => false);
    if (!exists) {
      await this.generateReceipt(registrationId);
    }
    const buffer = await fs.readFile(filePath);
    return buffer;
  }

  computeAge(birthDate: string) {
    return calculateAge(birthDate);
  }

  async generateReportPdf(filters: RegistrationFilters, groupBy: "event" | "church") {
    const registrations = await prisma.registration.findMany({
      where: buildRegistrationWhere(filters),
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
}

export const registrationService = new RegistrationService();
