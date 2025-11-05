-- AlterTable
ALTER TABLE "Church" ADD COLUMN "directorBirthDate" DATETIME;
ALTER TABLE "Church" ADD COLUMN "directorCpf" TEXT;
ALTER TABLE "Church" ADD COLUMN "directorEmail" TEXT;
ALTER TABLE "Church" ADD COLUMN "directorName" TEXT;
ALTER TABLE "Church" ADD COLUMN "directorPhotoUrl" TEXT;
ALTER TABLE "Church" ADD COLUMN "directorWhatsapp" TEXT;

-- AlterTable
ALTER TABLE "District" ADD COLUMN "pastorName" TEXT;

-- AlterTable
ALTER TABLE "Event" ADD COLUMN "bannerUrl" TEXT;
