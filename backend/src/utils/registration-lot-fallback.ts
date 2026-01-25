import { Prisma } from "@/prisma/generated/client";

export const registrationLotFallback = {
  lotIdExpr: Prisma.sql`COALESCE(o.pricingLotId, el2.id)`,
  lotNameExpr: Prisma.sql`COALESCE(el.name, el2.name)`,
  joinSql: Prisma.sql`
    LEFT JOIN EventLot el2
      ON el2.eventId = r.eventId
      AND r.createdAt >= el2.startsAt
      AND (el2.endsAt IS NULL OR r.createdAt <= el2.endsAt)
    LEFT JOIN EventLot el2_newer
      ON el2_newer.eventId = el2.eventId
      AND r.createdAt >= el2_newer.startsAt
      AND (el2_newer.endsAt IS NULL OR r.createdAt <= el2_newer.endsAt)
      AND el2_newer.startsAt > el2.startsAt
  `,
  latestLotCondition: Prisma.sql`el2_newer.id IS NULL`
};
