/*
  Warnings:

  - A unique constraint covering the columns `[jobId,userId]` on the table `ScheduledEmailJobRecipient` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[jobId,email]` on the table `ScheduledEmailJobRecipient` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "ScheduledEmailJobRecipient" ADD COLUMN     "email" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "ScheduledEmailJobRecipient_jobId_userId_key" ON "ScheduledEmailJobRecipient"("jobId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "ScheduledEmailJobRecipient_jobId_email_key" ON "ScheduledEmailJobRecipient"("jobId", "email");
