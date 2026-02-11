/*
  Warnings:

  - A unique constraint covering the columns `[type]` on the table `ScheduledEmailJob` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "ScheduledEmailJob_type_key" ON "ScheduledEmailJob"("type");
