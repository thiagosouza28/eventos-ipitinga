/*
  Warnings:

  - You are about to alter the column `directorName` on the `Church` table. The data in that column could be lost. The data in that column will be cast from `VarChar(255)` to `VarChar(191)`.
  - You are about to alter the column `directorEmail` on the `Church` table. The data in that column could be lost. The data in that column will be cast from `VarChar(255)` to `VarChar(191)`.
  - You are about to alter the column `clientId` on the `PixGatewayConfig` table. The data in that column could be lost. The data in that column will be cast from `VarChar(255)` to `VarChar(191)`.
  - You are about to alter the column `clientSecret` on the `PixGatewayConfig` table. The data in that column could be lost. The data in that column will be cast from `VarChar(255)` to `VarChar(191)`.
  - You are about to alter the column `apiKey` on the `PixGatewayConfig` table. The data in that column could be lost. The data in that column will be cast from `VarChar(255)` to `VarChar(191)`.
  - You are about to alter the column `webhookUrl` on the `PixGatewayConfig` table. The data in that column could be lost. The data in that column will be cast from `VarChar(255)` to `VarChar(191)`.
  - You are about to alter the column `certificatePath` on the `PixGatewayConfig` table. The data in that column could be lost. The data in that column will be cast from `VarChar(255)` to `VarChar(191)`.
  - Added the required column `districtId` to the `Event` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Church` MODIFY `directorName` VARCHAR(191) NULL,
    MODIFY `directorCpf` VARCHAR(191) NULL,
    MODIFY `directorEmail` VARCHAR(191) NULL,
    MODIFY `directorWhatsapp` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Event` ADD COLUMN `churchId` VARCHAR(191) NULL,
    ADD COLUMN `districtId` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `Order` ADD COLUMN `amountToTransfer` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `districtAdminId` VARCHAR(191) NULL,
    ADD COLUMN `districtId` VARCHAR(191) NULL,
    ADD COLUMN `responsibleUserId` VARCHAR(191) NULL,
    ADD COLUMN `transferBatchId` VARCHAR(191) NULL,
    ADD COLUMN `transferStatus` ENUM('PENDING', 'TRANSFERRED', 'FAILED') NULL;

-- AlterTable
ALTER TABLE `PixGatewayConfig` MODIFY `provider` VARCHAR(191) NOT NULL,
    MODIFY `clientId` VARCHAR(191) NULL,
    MODIFY `clientSecret` VARCHAR(191) NULL,
    MODIFY `apiKey` VARCHAR(191) NULL,
    MODIFY `webhookUrl` VARCHAR(191) NULL,
    MODIFY `certificatePath` VARCHAR(191) NULL,
    ALTER COLUMN `updatedAt` DROP DEFAULT;

-- AlterTable
ALTER TABLE `Registration` ADD COLUMN `responsibleUserId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `User` ADD COLUMN `pixBankName` VARCHAR(191) NULL,
    ADD COLUMN `pixKey` VARCHAR(191) NULL,
    ADD COLUMN `pixOwnerDocument` VARCHAR(191) NULL,
    ADD COLUMN `pixOwnerName` VARCHAR(191) NULL,
    ADD COLUMN `pixStatus` ENUM('VALIDATED', 'PENDING') NOT NULL DEFAULT 'PENDING',
    ADD COLUMN `pixType` ENUM('CPF', 'CNPJ', 'EMAIL', 'PHONE', 'EVP', 'RANDOM') NULL;

-- CreateTable
CREATE TABLE `Transfer` (
    `id` VARCHAR(191) NOT NULL,
    `districtId` VARCHAR(191) NULL,
    `districtAdminId` VARCHAR(191) NULL,
    `responsibleUserId` VARCHAR(191) NULL,
    `amount` INTEGER NOT NULL,
    `pixType` ENUM('CPF', 'CNPJ', 'EMAIL', 'PHONE', 'EVP', 'RANDOM') NULL,
    `pixKey` VARCHAR(191) NULL,
    `pixOwnerName` VARCHAR(191) NULL,
    `pixOwnerDocument` VARCHAR(191) NULL,
    `pixBankName` VARCHAR(191) NULL,
    `orderIds` JSON NOT NULL,
    `mpTransferId` VARCHAR(191) NULL,
    `status` ENUM('PENDING', 'SUCCESS', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `errorMessage` VARCHAR(191) NULL,
    `createdById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Transfer_districtId_idx`(`districtId`),
    INDEX `Transfer_districtAdminId_idx`(`districtAdminId`),
    INDEX `Transfer_responsibleUserId_idx`(`responsibleUserId`),
    INDEX `Transfer_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `AuditLog_entity_entityId_idx` ON `AuditLog`(`entity`, `entityId`);

-- CreateIndex
CREATE INDEX `Event_districtId_idx` ON `Event`(`districtId`);

-- CreateIndex
CREATE INDEX `Event_churchId_idx` ON `Event`(`churchId`);

-- CreateIndex
CREATE INDEX `Event_isActive_startDate_idx` ON `Event`(`isActive`, `startDate`);

-- CreateIndex
CREATE INDEX `Order_districtId_idx` ON `Order`(`districtId`);

-- CreateIndex
CREATE INDEX `Order_districtAdminId_idx` ON `Order`(`districtAdminId`);

-- CreateIndex
CREATE INDEX `Order_responsibleUserId_idx` ON `Order`(`responsibleUserId`);

-- CreateIndex
CREATE INDEX `Order_transferStatus_idx` ON `Order`(`transferStatus`);

-- CreateIndex
CREATE INDEX `Order_transferBatchId_idx` ON `Order`(`transferBatchId`);

-- CreateIndex
CREATE INDEX `Order_buyerCpf_status_idx` ON `Order`(`buyerCpf`, `status`);

-- CreateIndex
CREATE INDEX `Order_eventId_buyerCpf_status_idx` ON `Order`(`eventId`, `buyerCpf`, `status`);

-- CreateIndex
CREATE INDEX `Registration_responsibleUserId_idx` ON `Registration`(`responsibleUserId`);

-- CreateIndex
CREATE INDEX `Registration_eventId_status_createdAt_idx` ON `Registration`(`eventId`, `status`, `createdAt`);

-- AddForeignKey
ALTER TABLE `Event` ADD CONSTRAINT `Event_districtId_fkey` FOREIGN KEY (`districtId`) REFERENCES `District`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Event` ADD CONSTRAINT `Event_churchId_fkey` FOREIGN KEY (`churchId`) REFERENCES `Church`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Order` ADD CONSTRAINT `Order_districtId_fkey` FOREIGN KEY (`districtId`) REFERENCES `District`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Order` ADD CONSTRAINT `Order_districtAdminId_fkey` FOREIGN KEY (`districtAdminId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Order` ADD CONSTRAINT `Order_responsibleUserId_fkey` FOREIGN KEY (`responsibleUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Order` ADD CONSTRAINT `Order_transferBatchId_fkey` FOREIGN KEY (`transferBatchId`) REFERENCES `Transfer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Registration` ADD CONSTRAINT `Registration_responsibleUserId_fkey` FOREIGN KEY (`responsibleUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Transfer` ADD CONSTRAINT `Transfer_districtId_fkey` FOREIGN KEY (`districtId`) REFERENCES `District`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Transfer` ADD CONSTRAINT `Transfer_districtAdminId_fkey` FOREIGN KEY (`districtAdminId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Transfer` ADD CONSTRAINT `Transfer_responsibleUserId_fkey` FOREIGN KEY (`responsibleUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Transfer` ADD CONSTRAINT `Transfer_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
