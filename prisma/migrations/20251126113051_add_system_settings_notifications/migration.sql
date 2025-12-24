-- AlterTable
ALTER TABLE "SystemSettings" ADD COLUMN     "emailNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "lateAlertsEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "pointageRemindersEnabled" BOOLEAN NOT NULL DEFAULT true;
