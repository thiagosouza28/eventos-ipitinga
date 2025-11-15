import { PrismaClient } from "@/prisma/generated/client";

type QueryEvent = {
  query: string;
  params: string;
};

const prisma = new PrismaClient({
  log:
    process.env.NODE_ENV === "production"
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
  if (process.env.NODE_ENV === "production") return;
  const masked = event.params.replace(/(\d{3})\d{3}\d{3}(\d{2})/g, "$1***$2");
  console.debug(`\u001b[36m[prisma]\u001b[0m ${event.query} -- ${masked}`);
});

export { prisma };
