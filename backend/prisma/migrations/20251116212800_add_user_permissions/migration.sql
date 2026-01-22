-- Create table for custom user permissions
CREATE TABLE `UserPermission` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `module` VARCHAR(191) NOT NULL,
  `canView` BOOLEAN NOT NULL DEFAULT false,
  `canCreate` BOOLEAN NOT NULL DEFAULT false,
  `canEdit` BOOLEAN NOT NULL DEFAULT false,
  `canDelete` BOOLEAN NOT NULL DEFAULT false,
  `canApprove` BOOLEAN NOT NULL DEFAULT false,
  `canDeactivate` BOOLEAN NOT NULL DEFAULT false,
  `canReport` BOOLEAN NOT NULL DEFAULT false,
  `canFinancial` BOOLEAN NOT NULL DEFAULT false,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE UNIQUE INDEX `UserPermission_userId_module_key` ON `UserPermission`(`userId`, `module`);
CREATE INDEX `UserPermission_userId_idx` ON `UserPermission`(`userId`);

ALTER TABLE `UserPermission`
  ADD CONSTRAINT `UserPermission_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `User`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;
