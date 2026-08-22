import type { Prisma } from "@prisma/client";

import { prisma } from "../../lib/prisma";
import { env } from "../../config/env";
import { cacheDelete, cacheGetOrSet } from "../../utils/cache";
import {
  DEFAULT_SYSTEM_CONFIG,
  mergeSystemConfig,
  type PartialSystemConfigSettings,
  type SystemConfigSettings
} from "./system-config.types";

export type SystemConfigDto = {
  id: string;
  updatedAt: Date;
  updatedBy: { id: string; name: string; email: string } | null;
  settings: SystemConfigSettings;
};

const includeAuthor = {
  include: {
    updatedBy: {
      select: { id: true, name: true, email: true }
    }
  }
} satisfies Prisma.SystemConfigDefaultArgs;

type SystemConfigWithAuthor = Prisma.SystemConfigGetPayload<typeof includeAuthor>;

const PUBLIC_CONFIG_CACHE_KEY = "system-config:public";
const ADMIN_CONFIG_CACHE_KEY = "system-config:admin";

class SystemConfigService {
  private async findOrCreateConfig() {
    let record = await prisma.systemConfig.findFirst({
      ...includeAuthor,
      orderBy: { createdAt: "asc" }
    });
    if (record) {
      return record;
    }
    const created = await prisma.systemConfig.create({
      data: {
        settings: DEFAULT_SYSTEM_CONFIG
      }
    });
    record = await prisma.systemConfig.findUnique({
      where: { id: created.id },
      ...includeAuthor
    });
    if (!record) {
      throw new Error("Unable to initialize system configuration");
    }
    return record;
  }

  private toDto(record: SystemConfigWithAuthor): SystemConfigDto {
    const settings = mergeSystemConfig(record.settings);
    return {
      id: record.id,
      updatedAt: record.updatedAt,
      updatedBy: record.updatedBy ? { ...record.updatedBy } : null,
      settings
    };
  }

  async getPublicConfig() {
    return cacheGetOrSet(
      PUBLIC_CONFIG_CACHE_KEY,
      env.CACHE_TTL_MS,
      async () => {
        const record = await this.findOrCreateConfig();
        return this.toDto(record);
      },
      { maxEntries: env.CACHE_MAX_ENTRIES }
    );
  }

  async getAdminConfig() {
    return cacheGetOrSet(
      ADMIN_CONFIG_CACHE_KEY,
      env.CACHE_TTL_MS,
      async () => {
        const record = await this.findOrCreateConfig();
        return this.toDto(record);
      },
      { maxEntries: env.CACHE_MAX_ENTRIES }
    );
  }

  async updateSettings(partial: PartialSystemConfigSettings, actorUserId?: string) {
    const record = await this.findOrCreateConfig();
    const merged = mergeSystemConfig(record.settings, partial);
    const updated = await prisma.systemConfig.update({
      where: { id: record.id },
      data: {
        settings: merged,
        updatedById: actorUserId ?? record.updatedById ?? null
      },
      ...includeAuthor
    });
    cacheDelete(PUBLIC_CONFIG_CACHE_KEY);
    cacheDelete(ADMIN_CONFIG_CACHE_KEY);
    return this.toDto(updated);
  }
}

export const systemConfigService = new SystemConfigService();
