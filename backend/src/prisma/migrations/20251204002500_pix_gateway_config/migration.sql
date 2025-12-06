-- CreateTable
CREATE TABLE `PixGatewayConfig` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `provider` VARCHAR(50) NOT NULL,
    `clientId` VARCHAR(255) NULL,
    `clientSecret` VARCHAR(255) NULL,
    `apiKey` VARCHAR(255) NULL,
    `webhookUrl` VARCHAR(255) NULL,
    `certificatePath` VARCHAR(255) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Make church director fields optional at the database level
ALTER TABLE `Church`
    MODIFY `directorName` VARCHAR(255) NULL,
    MODIFY `directorCpf` VARCHAR(14) NULL,
    MODIFY `directorBirthDate` DATETIME(3) NULL,
    MODIFY `directorEmail` VARCHAR(255) NULL,
    MODIFY `directorWhatsapp` VARCHAR(20) NULL,
    MODIFY `directorPhotoUrl` LONGTEXT NULL;
