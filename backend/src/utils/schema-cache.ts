import { env } from "../config/env";
import { prisma } from "../lib/prisma";
import { cacheGetOrSet } from "./cache";

const COLUMN_CACHE_PREFIX = "schema:columns:";
const TABLE_CACHE_PREFIX = "schema:tables:";

export const getTableColumns = async (tableName: string) => {
  return cacheGetOrSet<string[]>(
    `${COLUMN_CACHE_PREFIX}${tableName}`,
    env.SCHEMA_CACHE_TTL_MS,
    async () => {
      const rows = await prisma.$queryRaw<{ column_name: string }[]>`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = DATABASE() AND table_name = ${tableName}
      `;
      return rows.map((row) => row.column_name);
    },
    { maxEntries: env.CACHE_MAX_ENTRIES }
  );
};

export const hasColumn = async (tableName: string, columnName: string) => {
  const columns = await getTableColumns(tableName);
  return columns.includes(columnName);
};

export const hasTable = async (tableName: string) => {
  return cacheGetOrSet<boolean>(
    `${TABLE_CACHE_PREFIX}${tableName}`,
    env.SCHEMA_CACHE_TTL_MS,
    async () => {
      const rows = await prisma.$queryRaw<{ table_name: string }[]>`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = DATABASE() AND table_name = ${tableName}
      `;
      return rows.length > 0;
    },
    { maxEntries: env.CACHE_MAX_ENTRIES }
  );
};
