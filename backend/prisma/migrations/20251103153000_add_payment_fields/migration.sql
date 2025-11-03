-- Add payment fields and manual tracking columns
PRAGMA foreign_keys=OFF;

ALTER TABLE "Event" ADD COLUMN "paymentMethods" TEXT NOT NULL DEFAULT 'PIX_MP';
ALTER TABLE "Order" ADD COLUMN "paymentMethod" TEXT NOT NULL DEFAULT 'PIX_MP';
ALTER TABLE "Order" ADD COLUMN "paidAt" DATETIME;
ALTER TABLE "Order" ADD COLUMN "manualPaymentReference" TEXT;
ALTER TABLE "Registration" ADD COLUMN "gender" TEXT;
ALTER TABLE "Registration" ADD COLUMN "paymentMethod" TEXT;
ALTER TABLE "Registration" ADD COLUMN "paidAt" DATETIME;

PRAGMA foreign_keys=ON;