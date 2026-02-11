-- CreateEnum
CREATE TYPE "ScheduledEmailType" AS ENUM ('DAILY_REPORT', 'WEEKLY_REPORT');

-- CreateEnum
CREATE TYPE "DailyReportMode" AS ENUM ('TODAY', 'YESTERDAY');

-- AlterTable
ALTER TABLE "SystemSettings" ADD COLUMN     "dailyReportMode" "DailyReportMode" NOT NULL DEFAULT 'YESTERDAY';

-- CreateTable
CREATE TABLE "ScheduledEmailJob" (
    "id" TEXT NOT NULL,
    "type" "ScheduledEmailType" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "hour" INTEGER NOT NULL,
    "minute" INTEGER NOT NULL,
    "weekday" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduledEmailJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduledEmailJobRecipient" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "ScheduledEmailJobRecipient_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ScheduledEmailJobRecipient" ADD CONSTRAINT "ScheduledEmailJobRecipient_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ScheduledEmailJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledEmailJobRecipient" ADD CONSTRAINT "ScheduledEmailJobRecipient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
