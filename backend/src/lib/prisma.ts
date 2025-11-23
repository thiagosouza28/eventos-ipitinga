import { PrismaClient } from "@/prisma/generated/client";

import { env } from "../config/env";
import { requestScope } from "./request-scope";

type QueryEvent = {
  query: string;
  params: string;
};

const isProduction = env.NODE_ENV === "production";

const prisma = new PrismaClient({
  log: isProduction
    ? ["error"]
    : [
        {
          emit: "event",
          level: "query"
        },
        "error",
        "warn"
      ]
});

prisma.$on("query", (event: QueryEvent) => {
  if (isProduction) return;
  const masked = event.params.replace(/(\d{3})\d{3}\d{3}(\d{2})/g, "$1***$2");
  console.debug(`\u001b[36m[prisma]\u001b[0m ${event.query} -- ${masked}`);
});

const appendWhere = (current: any, extra: any) => {
  if (!extra) return current;
  if (!current) return extra;
  return { AND: [current, extra] };
};

prisma.$use(async (params, next) => {
  const scope = requestScope.get();
  if (!scope || (!scope.ministryId && !scope.churchId)) {
    return next(params);
  }

  const buildScopeWhere = () => {
    if (params.model === "Event" && scope.ministryId) {
      return { ministryId: scope.ministryId };
    }
    if (params.model === "Registration") {
      const filters: Record<string, unknown> = {};
      if (scope.ministryId) {
        filters.ministryId = scope.ministryId;
      }
      if (scope.churchId) {
        filters.churchId = scope.churchId;
      }
      return Object.keys(filters).length ? filters : null;
    }
    return null;
  };

  const scopedWhere = buildScopeWhere();
  if (!scopedWhere) {
    return next(params);
  }

  const actionsWithWhere = new Set([
    "findMany",
    "findFirst",
    "findFirstOrThrow",
    "count",
    "aggregate",
    "groupBy",
    "updateMany",
    "deleteMany"
  ]);
  const uniqueActions = new Set(["findUnique", "findUniqueOrThrow"]);

  if (actionsWithWhere.has(params.action)) {
    params.args = params.args ?? {};
    params.args.where = appendWhere(params.args.where, scopedWhere);
    return next(params);
  }

  if (uniqueActions.has(params.action)) {
    params.action = params.action === "findUnique" ? "findFirst" : "findFirstOrThrow";
    params.args = params.args ?? {};
    params.args.where = appendWhere(params.args.where, scopedWhere);
    return next(params);
  }

  return next(params);
});

export { prisma };
