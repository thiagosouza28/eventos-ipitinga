-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "madeBy" TEXT NOT NULL,
    "items" TEXT,
    "receiptUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "buyerCpf" TEXT NOT NULL,
    "totalCents" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paymentMethod" TEXT NOT NULL DEFAULT 'PIX_MP',
    "mpPaymentId" TEXT,
    "mpPreferenceId" TEXT,
    "preferenceVersion" INTEGER NOT NULL DEFAULT 0,
    "pricingLotId" TEXT,
    "externalReference" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "paidAt" DATETIME,
    "manualPaymentReference" TEXT,
    "feeCents" INTEGER NOT NULL DEFAULT 0,
    "netAmountCents" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Order" ("buyerCpf", "createdAt", "eventId", "expiresAt", "externalReference", "id", "manualPaymentReference", "mpPaymentId", "mpPreferenceId", "paidAt", "paymentMethod", "preferenceVersion", "pricingLotId", "status", "totalCents") SELECT "buyerCpf", "createdAt", "eventId", "expiresAt", "externalReference", "id", "manualPaymentReference", "mpPaymentId", "mpPreferenceId", "paidAt", "paymentMethod", "preferenceVersion", "pricingLotId", "status", "totalCents" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
CREATE UNIQUE INDEX "Order_externalReference_key" ON "Order"("externalReference");
CREATE INDEX "Order_eventId_idx" ON "Order"("eventId");
CREATE INDEX "Order_buyerCpf_idx" ON "Order"("buyerCpf");
CREATE INDEX "Order_status_idx" ON "Order"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Expense_eventId_idx" ON "Expense"("eventId");

-- CreateIndex
CREATE INDEX "Expense_date_idx" ON "Expense"("date");
