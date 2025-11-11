/*
  Warnings:

  - A unique constraint covering the columns `[cpf]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `event` ADD COLUMN `ministryId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `registration` ADD COLUMN `ministryId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `user` ADD COLUMN `cpf` VARCHAR(191) NULL,
    ADD COLUMN `mustChangePassword` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `phone` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `Ministry` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Ministry_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MinistryUser` (
    `userId` VARCHAR(191) NOT NULL,
    `ministryId` VARCHAR(191) NOT NULL,
    `assignedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `MinistryUser_ministryId_idx`(`ministryId`),
    PRIMARY KEY (`userId`, `ministryId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Event_ministryId_idx` ON `Event`(`ministryId`);

-- CreateIndex
CREATE UNIQUE INDEX `User_cpf_key` ON `User`(`cpf`);

-- AddForeignKey
ALTER TABLE `Event` ADD CONSTRAINT `Event_ministryId_fkey` FOREIGN KEY (`ministryId`) REFERENCES `Ministry`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Registration` ADD CONSTRAINT `Registration_ministryId_fkey` FOREIGN KEY (`ministryId`) REFERENCES `Ministry`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MinistryUser` ADD CONSTRAINT `MinistryUser_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MinistryUser` ADD CONSTRAINT `MinistryUser_ministryId_fkey` FOREIGN KEY (`ministryId`) REFERENCES `Ministry`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
