import { prisma } from "../lib/prisma";
import { ForbiddenError } from "./errors";

export const ensureEventMinistryAccess = async (eventId: string, ministryIds?: string[]) => {
  if (!ministryIds || !ministryIds.length) {
    return;
  }
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { ministryId: true }
  });
  if (!event || !event.ministryId || !ministryIds.includes(event.ministryId)) {
    throw new ForbiddenError("Evento não pertence ao ministério do usuário");
  }
};
