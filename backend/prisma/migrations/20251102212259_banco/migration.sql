-- CreateTable
CREATE TABLE "EventLot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "startsAt" DATETIME NOT NULL,
    "endsAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "location" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL DEFAULT 0,
    "minAgeYears" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "slug" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Event" ("createdAt", "description", "endDate", "id", "isActive", "location", "minAgeYears", "priceCents", "slug", "startDate", "title") SELECT "createdAt", "description", "endDate", "id", "isActive", "location", "minAgeYears", "priceCents", "slug", "startDate", "title" FROM "Event";
DROP TABLE "Event";
ALTER TABLE "new_Event" RENAME TO "Event";
CREATE UNIQUE INDEX "Event_slug_key" ON "Event"("slug");
CREATE TABLE "new_Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "buyerCpf" TEXT NOT NULL,
    "totalCents" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "mpPaymentId" TEXT,
    "mpPreferenceId" TEXT,
    "preferenceVersion" INTEGER NOT NULL DEFAULT 0,
    "pricingLotId" TEXT,
    "externalReference" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Order" ("buyerCpf", "createdAt", "eventId", "expiresAt", "externalReference", "id", "mpPaymentId", "mpPreferenceId", "status", "totalCents") SELECT "buyerCpf", "createdAt", "eventId", "expiresAt", "externalReference", "id", "mpPaymentId", "mpPreferenceId", "status", "totalCents" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
CREATE UNIQUE INDEX "Order_externalReference_key" ON "Order"("externalReference");
CREATE INDEX "Order_eventId_idx" ON "Order"("eventId");
CREATE INDEX "Order_buyerCpf_idx" ON "Order"("buyerCpf");
CREATE INDEX "Order_status_idx" ON "Order"("status");
CREATE TABLE "new_Registration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "birthDate" DATETIME NOT NULL,
    "ageYears" INTEGER NOT NULL,
    "priceCents" INTEGER NOT NULL DEFAULT 0,
    "districtId" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "photoUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "receiptPdfUrl" TEXT,
    "checkinAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Registration" ("ageYears", "birthDate", "checkinAt", "churchId", "cpf", "createdAt", "districtId", "eventId", "fullName", "id", "orderId", "photoUrl", "receiptPdfUrl", "status") SELECT "ageYears", "birthDate", "checkinAt", "churchId", "cpf", "createdAt", "districtId", "eventId", "fullName", "id", "orderId", "photoUrl", "receiptPdfUrl", "status" FROM "Registration";
DROP TABLE "Registration";
ALTER TABLE "new_Registration" RENAME TO "Registration";
CREATE INDEX "Registration_orderId_idx" ON "Registration"("orderId");
CREATE INDEX "Registration_eventId_idx" ON "Registration"("eventId");
CREATE INDEX "Registration_cpf_idx" ON "Registration"("cpf");
CREATE INDEX "Registration_status_idx" ON "Registration"("status");
CREATE UNIQUE INDEX "Registration_eventId_cpf_key" ON "Registration"("eventId", "cpf");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "EventLot_eventId_idx" ON "EventLot"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "EventLot_eventId_name_key" ON "EventLot"("eventId", "name");
