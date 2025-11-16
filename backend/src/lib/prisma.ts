import { PrismaClient } from "@/prisma/generated/client";

import { env } from "../config/env";

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

export { prisma };
