-- AlterTable
ALTER TABLE `Order`
    ADD COLUMN `origin` ENUM('MARKETPLACE', 'MANUAL') NOT NULL DEFAULT 'MARKETPLACE',
    ADD COLUMN `responsibleName` VARCHAR(191) NULL,
    ADD COLUMN `responsibleDocument` VARCHAR(191) NULL,
    ADD COLUMN `responsibleEmail` VARCHAR(191) NULL,
    ADD COLUMN `responsiblePhone` VARCHAR(191) NULL,
    ADD COLUMN `amountReceivedCents` INTEGER NULL,
    ADD COLUMN `manualNotes` LONGTEXT NULL,
    ADD COLUMN `confirmedById` VARCHAR(191) NULL,
    ADD COLUMN `confirmedAt` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `OrderItem` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `registrationId` VARCHAR(191) NOT NULL,
    `amountCents` INTEGER NOT NULL,
    `status` ENUM('PENDING', 'CONFIRMED', 'CANCELED') NOT NULL DEFAULT 'PENDING',
    `notes` LONGTEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `confirmedById` VARCHAR(191) NULL,

    UNIQUE INDEX `OrderItem_orderId_registrationId_key`(`orderId`, `registrationId`),
    INDEX `OrderItem_registrationId_idx`(`registrationId`),
    INDEX `OrderItem_confirmedById_idx`(`confirmedById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ServiceOrder` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `number` INTEGER NOT NULL,
    `totalCents` INTEGER NOT NULL,
    `proofUrl` LONGTEXT NULL,
    `pdfUrl` LONGTEXT NULL,
    `notes` LONGTEXT NULL,
    `metadata` JSON NULL,
    `issuedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `issuedById` VARCHAR(191) NULL,

    UNIQUE INDEX `ServiceOrder_orderId_number_key`(`orderId`, `number`),
    INDEX `ServiceOrder_orderId_idx`(`orderId`),
    INDEX `ServiceOrder_issuedById_idx`(`issuedById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Order_origin_idx` ON `Order`(`origin`);

-- CreateIndex
CREATE INDEX `Order_confirmedById_idx` ON `Order`(`confirmedById`);

-- AddForeignKey
ALTER TABLE `Order` ADD CONSTRAINT `Order_confirmedById_fkey` FOREIGN KEY (`confirmedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderItem` ADD CONSTRAINT `OrderItem_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderItem` ADD CONSTRAINT `OrderItem_registrationId_fkey` FOREIGN KEY (`registrationId`) REFERENCES `Registration`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderItem` ADD CONSTRAINT `OrderItem_confirmedById_fkey` FOREIGN KEY (`confirmedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServiceOrder` ADD CONSTRAINT `ServiceOrder_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServiceOrder` ADD CONSTRAINT `ServiceOrder_issuedById_fkey` FOREIGN KEY (`issuedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
