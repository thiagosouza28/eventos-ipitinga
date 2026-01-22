-- AlterTable
ALTER TABLE `Event` ADD COLUMN `createdById` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `Event` ADD CONSTRAINT `Event_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
