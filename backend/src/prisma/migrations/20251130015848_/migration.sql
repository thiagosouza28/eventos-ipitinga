-- DropForeignKey
ALTER TABLE `ServiceOrder` DROP FOREIGN KEY `ServiceOrder_orderId_fkey`;

-- AddForeignKey
ALTER TABLE `ServiceOrder` ADD CONSTRAINT `ServiceOrder_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
