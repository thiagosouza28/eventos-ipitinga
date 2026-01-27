import "tsconfig-paths/register";
import "../src/config/env";

import { prisma } from "../src/lib/prisma";
import { storageService } from "../src/storage/storage.service";
import { logger } from "../src/utils/logger";

const BATCH_SIZE = 25;

const migrateRegistrationPhotos = async () => {
  let cursor: string | null = null;
  let migrated = 0;
  let scanned = 0;

  while (true) {
    const batch: Array<{ id: string; photoUrl: string | null }> =
      await prisma.registration.findMany({
      where: {
        photoUrl: { startsWith: "data:" }
      },
      orderBy: { id: "asc" },
      take: BATCH_SIZE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: { id: true, photoUrl: true }
    });

    if (!batch.length) break;

    for (const item of batch) {
      scanned += 1;
      if (!item.photoUrl || !item.photoUrl.startsWith("data:")) continue;
      try {
        const stored = await storageService.saveBase64Image(item.photoUrl);
        if (stored && stored !== item.photoUrl) {
          await prisma.registration.update({
            where: { id: item.id },
            data: { photoUrl: stored }
          });
          migrated += 1;
        }
      } catch (error) {
        logger.warn({ error, id: item.id }, "Failed to migrate registration photo");
      }
    }

    cursor = batch[batch.length - 1]?.id ?? null;
  }

  logger.info({ scanned, migrated }, "Registration photo migration completed");
};

migrateRegistrationPhotos()
  .catch((error) => {
    logger.error({ error }, "Registration photo migration failed");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
