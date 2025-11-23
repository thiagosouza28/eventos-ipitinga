-- AlterTable
ALTER TABLE `User` ADD COLUMN `ministryId` VARCHAR(191) NULL,
    ADD COLUMN `passwordUpdatedAt` DATETIME(3) NULL;

-- CreateIndex
CREATE INDEX `User_ministryId_idx` ON `User`(`ministryId`);

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_ministryId_fkey` FOREIGN KEY (`ministryId`) REFERENCES `Ministry`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
