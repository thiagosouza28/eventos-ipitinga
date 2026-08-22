import { PrismaClient } from "@prisma/client";

import { env } from "../config/env";
import { requestScope } from "./request-scope";

type QueryEvent = {
  query: string;
  params: string;
};

const isProduction = env.NODE_ENV === "production";

const appendWhere = (current: any, extra: any) => {
  if (!extra) return current;
  if (!current) return extra;
  return { AND: [current, extra] };
};

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

const buildScopeWhere = (model: string, scope: { ministryId?: string; churchId?: string }) => {
  if (model === "Event" && scope.ministryId) {
    return { ministryId: scope.ministryId };
  }
  if (model === "Registration") {
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

const createPrismaClient = () => {
  const baseClient = new PrismaClient({
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

  const modelToDelegate = (model: string) => {
    const name = `${model.charAt(0).toLowerCase()}${model.slice(1)}`;
    return (baseClient as any)[name];
  };

  baseClient.$on("query", (event: QueryEvent) => {
    if (isProduction) return;
    const masked = event.params.replace(/(\d{3})\d{3}\d{3}(\d{2})/g, "$1***$2");
    console.debug(`\u001b[36m[prisma]\u001b[0m ${event.query} -- ${masked}`);
  });

  return baseClient.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const scope = requestScope.get();
          if (!model || !scope || (!scope.ministryId && !scope.churchId)) {
            return query(args);
          }

          const scopedWhere = buildScopeWhere(model, scope);
          if (!scopedWhere) {
            return query(args);
          }

          if (actionsWithWhere.has(operation)) {
            const nextArgs = (args ?? {}) as Record<string, any>;
            nextArgs.where = appendWhere(nextArgs.where, scopedWhere);
            return query(nextArgs as any);
          }

          if (uniqueActions.has(operation)) {
            const nextArgs = (args ?? {}) as Record<string, any>;
            const delegate = modelToDelegate(model);
            if (!delegate) {
              return query(nextArgs as any);
            }
            const op = operation === "findUnique" ? "findFirst" : "findFirstOrThrow";
            return delegate[op]({
              ...nextArgs,
              where: appendWhere(nextArgs.where, scopedWhere)
            });
          }

          return query(args);
        }
      }
    }
  });
};

type PrismaExtendedClient = ReturnType<typeof createPrismaClient>;
const globalForPrisma = globalThis as unknown as { prisma?: PrismaExtendedClient };

const prisma = globalForPrisma.prisma ?? createPrismaClient();
globalForPrisma.prisma = prisma;

export { prisma };
