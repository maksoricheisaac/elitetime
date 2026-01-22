-- AlterEnum
ALTER TYPE "UserStatus" ADD VALUE 'deleted';

-- AlterTable
ALTER TABLE "SystemSettings" ADD COLUMN     "ldapLastSyncAt" TIMESTAMP(3),
ADD COLUMN     "ldapSyncEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ldapSyncIntervalMinutes" INTEGER NOT NULL DEFAULT 60;
