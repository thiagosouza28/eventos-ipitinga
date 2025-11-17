import { prisma } from "../../lib/prisma";
import { env } from "../../config/env";
import { AppError, NotFoundError } from "../../utils/errors";
import { verifyCheckinSignature } from "../../utils/hmac";
import { registrationService } from "../registrations/registration.service";
import { sanitizeCpf } from "../../utils/mask";

const brDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo"
});

const registrationInclude = {
  event: true,
  church: { include: { district: true } },
  district: true
} as const;

const formatDateBr = (date: Date | null | undefined) =>
  date ? brDateFormatter.format(date) : "Nao informado";

const buildRegistrationPayload = (registration: any) => {
  const event = registration.event ?? {};
  const church = registration.church ?? {};
  const district = registration.district ?? church.district ?? {};
  return {
    id: registration.id,
    eventId: registration.eventId,
    fullName: registration.fullName,
    cpf: registration.cpf,
    eventTitle: event.title ?? "Nao informado",
    eventLocation: event.location ?? "Nao informado",
    eventPeriod: `${formatDateBr(event.startDate)} - ${formatDateBr(event.endDate)}`,
    districtName: district.name ?? "Nao informado",
    churchName: church.name ?? "Nao informado",
    photoUrl: registration.photoUrl ?? null,
    checkinAt: registration.checkinAt ? registration.checkinAt.toISOString() : null
  };
};

export class CheckinService {
  async getEventDashboard(eventId: string) {
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundError("Evento nao encontrado");

    const [counts, latest] = await Promise.all([
      prisma.registration.groupBy({
        by: ["status"],
        where: { eventId },
        _count: true
      }),
      prisma.registration.findMany({
        where: { eventId, status: "CHECKED_IN" },
        orderBy: { checkinAt: "desc" },
        take: 10,
        include: { church: true, district: true }
      })
    ]);

    return {
      event,
      totals: counts.reduce<Record<string, number>>((acc, item) => {
        acc[item.status] = item._count;
        return acc;
      }, {}),
      latest
    };
  }

  async scan({
    registrationId,
    signature
  }: {
    registrationId: string;
    signature?: string | null;
  }) {
    const registration = await prisma.registration.findUnique({
      where: { id: registrationId },
      include: registrationInclude
    });
    if (!registration) throw new NotFoundError("Inscricao nao encontrada");
    if (!signature) {
      throw new AppError("QR Code invalido", 400);
    }
    const isValid = verifyCheckinSignature(registration.id, registration.createdAt, signature);
    if (!isValid) {
      throw new AppError("QR Code invalido", 400);
    }

    const payload = buildRegistrationPayload(registration);

    if (registration.status === "CHECKED_IN") {
      return {
        status: "ALREADY_CONFIRMED" as const,
        registration: payload
      };
    }

    if (registration.status !== "PAID") {
      throw new AppError("Pagamento ainda nao confirmado. Tente novamente em instantes.", 400);
    }

    return {
      status: "READY" as const,
      registration: payload,
      confirmation: {
        registrationId: registration.id,
        signature
      }
    };
  }

  async manualLookup({
    cpf,
    birthDate
  }: {
    cpf: string;
    birthDate: string;
  }) {
    const sanitizedCpf = sanitizeCpf(cpf);
    const parsedBirth = new Date(birthDate);
    if (Number.isNaN(parsedBirth.getTime())) {
      throw new AppError("Data de nascimento invalida", 400);
    }
    const start = new Date(parsedBirth);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const registration = await prisma.registration.findFirst({
      where: {
        cpf: sanitizedCpf,
        birthDate: {
          gte: start,
          lt: end
        }
      },
      orderBy: { createdAt: "desc" },
      include: registrationInclude
    });
    if (!registration) {
      throw new NotFoundError("Inscricao nao localizada para CPF/Data informados");
    }

    const payload = buildRegistrationPayload(registration);

    if (registration.status === "CHECKED_IN") {
      return {
        status: "ALREADY_CONFIRMED" as const,
        registration: payload
      };
    }

    if (registration.status !== "PAID") {
      throw new AppError("Pagamento ainda nao confirmado. Tente novamente em instantes.", 400);
    }

    return {
      status: "READY" as const,
      registration: payload,
      confirmation: {
        registrationId: registration.id
      }
    };
  }

  async confirm({
    registrationId,
    signature
  }: {
    registrationId: string;
    signature?: string | null;
  }) {
    const registration = await prisma.registration.findUnique({
      where: { id: registrationId },
      include: registrationInclude
    });
    if (!registration) throw new NotFoundError("Inscricao nao encontrada");

    if (signature) {
      const isValid = verifyCheckinSignature(registration.id, registration.createdAt, signature);
      if (!isValid) {
        throw new AppError("QR Code invalido ou expirado", 400);
      }
    }

    if (registration.status === "CHECKED_IN") {
      return {
        status: "ALREADY_CONFIRMED" as const,
        registration: buildRegistrationPayload(registration)
      };
    }

    if (registration.status !== "PAID") {
      throw new AppError("Pagamento ainda nao confirmado. Tente novamente em instantes.", 400);
    }

    await registrationService.markCheckin(registration.id);
    const updated = await prisma.registration.findUnique({
      where: { id: registration.id },
      include: registrationInclude
    });
    if (!updated) {
      throw new NotFoundError("Inscricao nao encontrada apos confirmacao");
    }

    return {
      status: "CONFIRMED" as const,
      registration: buildRegistrationPayload(updated)
    };
  }

  async validateLink({
    registrationId,
    signature
  }: {
    registrationId: string;
    signature: string;
  }) {
    const registration = await prisma.registration.findUnique({
      where: { id: registrationId },
      include: registrationInclude
    });
    if (!registration) throw new NotFoundError("Inscricao nao encontrada");

    const isValid = verifyCheckinSignature(registration.id, registration.createdAt, signature);
    if (!isValid) {
      throw new AppError("Link de check-in invalido ou expirado", 400);
    }

    if (registration.status === "CHECKED_IN") {
      return {
        status: "ALREADY_CONFIRMED" as const,
        registration: buildRegistrationPayload(registration)
      };
    }

    if (registration.status !== "PAID") {
      throw new AppError("Pagamento ainda nao confirmado. Tente novamente em instantes.", 400);
    }

    return {
      status: "READY" as const,
      registration: buildRegistrationPayload(registration)
    };
  }

  async confirmLink({
    registrationId,
    signature,
    password
  }: {
    registrationId: string;
    signature: string;
    password: string;
  }) {
    const configuredPassword = env.CHECKIN_CONFIRM_PASSWORD?.trim();
    if (!configuredPassword) {
      throw new AppError("Senha de confirmação não configurada. Contate a administração.", 500);
    }

    if (configuredPassword !== password.trim()) {
      throw new AppError("Senha de confirmação inválida.", 401);
    }

    const registration = await prisma.registration.findUnique({
      where: { id: registrationId },
      include: registrationInclude
    });
    if (!registration) throw new NotFoundError("Inscricao nao encontrada");

    const isValid = verifyCheckinSignature(registration.id, registration.createdAt, signature);
    if (!isValid) {
      throw new AppError("Link de check-in invalido ou expirado", 400);
    }

    if (registration.status === "CHECKED_IN") {
      return {
        status: "ALREADY_CONFIRMED" as const,
        registration: buildRegistrationPayload(registration)
      };
    }

    if (registration.status !== "PAID") {
      throw new AppError("Pagamento ainda nao confirmado. Tente novamente em instantes.", 400);
    }

    await registrationService.markCheckin(registration.id);
    const updated = await prisma.registration.findUnique({
      where: { id: registration.id },
      include: registrationInclude
    });
    if (!updated) {
      throw new NotFoundError("Inscricao nao encontrada apos confirmacao");
    }

    return {
      status: "CONFIRMED" as const,
      registration: buildRegistrationPayload(updated)
    };
  }
}

export const checkinService = new CheckinService();
