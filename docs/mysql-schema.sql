CREATE DATABASE IF NOT EXISTS `catre_ipitinga` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `catre_ipitinga`;

CREATE TABLE `District` (
  `id` VARCHAR(25) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL UNIQUE,
  `pastorName` VARCHAR(255),
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE `Church` (
  `id` VARCHAR(25) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `districtId` VARCHAR(25) NOT NULL,
  `directorName` VARCHAR(255),
  `directorCpf` VARCHAR(32),
  `directorBirthDate` DATETIME,
  `directorEmail` VARCHAR(255),
  `directorWhatsapp` VARCHAR(64),
  `directorPhotoUrl` VARCHAR(1024),
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `church_district_name` (`districtId`, `name`),
  INDEX `idx_church_district` (`districtId`),
  CONSTRAINT `fk_church_district` FOREIGN KEY (`districtId`) REFERENCES `District` (`id`)
) ENGINE=InnoDB;

CREATE TABLE `Event` (
  `id` VARCHAR(25) PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NOT NULL,
  `startDate` DATETIME NOT NULL,
  `endDate` DATETIME NOT NULL,
  `location` VARCHAR(1024) NOT NULL,
  `bannerUrl` VARCHAR(1024),
  `priceCents` INT NOT NULL DEFAULT 0,
  `minAgeYears` INT,
  `isFree` BOOLEAN NOT NULL DEFAULT FALSE,
  `isActive` BOOLEAN NOT NULL DEFAULT TRUE,
  `slug` VARCHAR(255) NOT NULL UNIQUE,
  `paymentMethods` VARCHAR(255) NOT NULL DEFAULT 'PIX_MP',
  `pendingPaymentValueRule` VARCHAR(255) NOT NULL DEFAULT 'KEEP_ORIGINAL',
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE `EventLot` (
  `id` VARCHAR(25) PRIMARY KEY,
  `eventId` VARCHAR(25) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `priceCents` INT NOT NULL,
  `startsAt` DATETIME NOT NULL,
  `endsAt` DATETIME,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `event_lot_event_name` (`eventId`, `name`),
  INDEX `idx_eventlot_event` (`eventId`),
  CONSTRAINT `fk_eventlot_event` FOREIGN KEY (`eventId`) REFERENCES `Event` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE `Order` (
  `id` VARCHAR(25) PRIMARY KEY,
  `eventId` VARCHAR(25) NOT NULL,
  `buyerCpf` VARCHAR(20) NOT NULL,
  `totalCents` INT NOT NULL,
  `status` VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  `paymentMethod` VARCHAR(255) NOT NULL DEFAULT 'PIX_MP',
  `mpPaymentId` VARCHAR(255),
  `mpPreferenceId` VARCHAR(255),
  `preferenceVersion` INT NOT NULL DEFAULT 0,
  `pricingLotId` VARCHAR(25),
  `externalReference` VARCHAR(255) NOT NULL UNIQUE,
  `expiresAt` DATETIME NOT NULL,
  `paidAt` DATETIME,
  `manualPaymentReference` VARCHAR(255),
  `feeCents` INT NOT NULL DEFAULT 0,
  `netAmountCents` INT NOT NULL DEFAULT 0,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_order_event` (`eventId`),
  INDEX `idx_order_buyerCpf` (`buyerCpf`),
  INDEX `idx_order_status` (`status`),
  CONSTRAINT `fk_order_event` FOREIGN KEY (`eventId`) REFERENCES `Event` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_order_lot` FOREIGN KEY (`pricingLotId`) REFERENCES `EventLot` (`id`)
) ENGINE=InnoDB;

CREATE TABLE `Registration` (
  `id` VARCHAR(25) PRIMARY KEY,
  `orderId` VARCHAR(25) NOT NULL,
  `eventId` VARCHAR(25) NOT NULL,
  `fullName` VARCHAR(255) NOT NULL,
  `cpf` VARCHAR(20) NOT NULL,
  `birthDate` DATETIME NOT NULL,
  `ageYears` INT NOT NULL,
  `priceCents` INT NOT NULL DEFAULT 0,
  `districtId` VARCHAR(25) NOT NULL,
  `churchId` VARCHAR(25) NOT NULL,
  `photoUrl` TEXT,
  `gender` VARCHAR(32),
  `paymentMethod` VARCHAR(255),
  `status` VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
  `receiptPdfUrl` VARCHAR(1024),
  `checkinAt` DATETIME,
  `paidAt` DATETIME,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uniq_registration_event_cpf` (`eventId`, `cpf`),
  INDEX `idx_registration_order` (`orderId`),
  INDEX `idx_registration_event` (`eventId`),
  INDEX `idx_registration_cpf` (`cpf`),
  INDEX `idx_registration_status` (`status`),
  CONSTRAINT `fk_registration_order` FOREIGN KEY (`orderId`) REFERENCES `Order` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_registration_event` FOREIGN KEY (`eventId`) REFERENCES `Event` (`id`),
  CONSTRAINT `fk_registration_district` FOREIGN KEY (`districtId`) REFERENCES `District` (`id`),
  CONSTRAINT `fk_registration_church` FOREIGN KEY (`churchId`) REFERENCES `Church` (`id`)
) ENGINE=InnoDB;

CREATE TABLE `Refund` (
  `id` VARCHAR(25) PRIMARY KEY,
  `orderId` VARCHAR(25) NOT NULL,
  `registrationId` VARCHAR(25) NOT NULL,
  `amountCents` INT NOT NULL,
  `mpRefundId` VARCHAR(255) NOT NULL,
  `reason` TEXT,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_refund_order` FOREIGN KEY (`orderId`) REFERENCES `Order` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_refund_registration` FOREIGN KEY (`registrationId`) REFERENCES `Registration` (`id`)
) ENGINE=InnoDB;

CREATE TABLE `WebhookEvent` (
  `id` VARCHAR(25) PRIMARY KEY,
  `provider` VARCHAR(255) NOT NULL,
  `eventType` VARCHAR(255) NOT NULL,
  `payloadJson` TEXT NOT NULL,
  `idempotencyKey` VARCHAR(255) NOT NULL UNIQUE,
  `processedAt` DATETIME,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `orderId` VARCHAR(25),
  CONSTRAINT `fk_webhook_order` FOREIGN KEY (`orderId`) REFERENCES `Order` (`id`)
) ENGINE=InnoDB;

CREATE TABLE `AuditLog` (
  `id` VARCHAR(25) PRIMARY KEY,
  `actorUserId` VARCHAR(25),
  `action` VARCHAR(255) NOT NULL,
  `entity` VARCHAR(255) NOT NULL,
  `entityId` VARCHAR(255) NOT NULL,
  `metadataJson` TEXT,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_auditlog_user` FOREIGN KEY (`actorUserId`) REFERENCES `User` (`id`)
) ENGINE=InnoDB;

CREATE TABLE `User` (
  `id` VARCHAR(25) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `passwordHash` VARCHAR(255) NOT NULL,
  `role` VARCHAR(64) NOT NULL,
  `districtScopeId` VARCHAR(25),
  `churchScopeId` VARCHAR(25),
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_user_districtscope` FOREIGN KEY (`districtScopeId`) REFERENCES `District` (`id`),
  CONSTRAINT `fk_user_churchscope` FOREIGN KEY (`churchScopeId`) REFERENCES `Church` (`id`)
) ENGINE=InnoDB;

CREATE TABLE `Expense` (
  `id` VARCHAR(25) PRIMARY KEY,
  `eventId` VARCHAR(25) NOT NULL,
  `description` TEXT NOT NULL,
  `date` DATETIME NOT NULL,
  `amountCents` INT NOT NULL,
  `madeBy` VARCHAR(255) NOT NULL,
  `items` TEXT,
  `receiptUrl` VARCHAR(1024),
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_expense_event` (`eventId`),
  INDEX `idx_expense_date` (`date`),
  CONSTRAINT `fk_expense_event` FOREIGN KEY (`eventId`) REFERENCES `Event` (`id`)
) ENGINE=InnoDB;
