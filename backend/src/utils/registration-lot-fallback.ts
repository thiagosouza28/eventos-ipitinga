import { Prisma } from "@prisma/client";

export const registrationLotFallback = {
  lotIdExpr: Prisma.sql`COALESCE(o.pricing_lot_id, el2.id)`,
  lotNameExpr: Prisma.sql`COALESCE(el.name, el2.name)`,
  joinSql: Prisma.sql`
    LEFT JOIN event_lots el2
      ON el2.event_id = r.event_id
      AND r.created_at >= el2.starts_at
      AND (el2.ends_at IS NULL OR r.created_at <= el2.ends_at)
    LEFT JOIN event_lots el2_newer
      ON el2_newer.event_id = el2.event_id
      AND r.created_at >= el2_newer.starts_at
      AND (el2_newer.ends_at IS NULL OR r.created_at <= el2_newer.ends_at)
      AND el2_newer.starts_at > el2.starts_at
  `,
  latestLotCondition: Prisma.sql`el2_newer.id IS NULL`
};
