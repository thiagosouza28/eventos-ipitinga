-- Safety net to align schema: ensure ServiceOrder table exists
CREATE TABLE IF NOT EXISTS `ServiceOrder` (
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

-- Add foreign keys only when they do not exist (avoid duplicate constraint errors)
SET @fk_order_exists := (
  SELECT COUNT(*)
  FROM information_schema.REFERENTIAL_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND CONSTRAINT_NAME = 'ServiceOrder_orderId_fkey'
);

SET @sql_order_fk := IF(
  @fk_order_exists = 0,
  'ALTER TABLE `ServiceOrder` ADD CONSTRAINT `ServiceOrder_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;',
  'SELECT 1'
);
PREPARE stmt FROM @sql_order_fk;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_issued_exists := (
  SELECT COUNT(*)
  FROM information_schema.REFERENTIAL_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND CONSTRAINT_NAME = 'ServiceOrder_issuedById_fkey'
);

SET @sql_issued_fk := IF(
  @fk_issued_exists = 0,
  'ALTER TABLE `ServiceOrder` ADD CONSTRAINT `ServiceOrder_issuedById_fkey` FOREIGN KEY (`issuedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;',
  'SELECT 1'
);
PREPARE stmt FROM @sql_issued_fk;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
