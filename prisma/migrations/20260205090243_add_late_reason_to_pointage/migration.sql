/*
  Warnings:

  - You are about to drop the column `headId` on the `Department` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Department" DROP CONSTRAINT "Department_headId_fkey";

-- AlterTable
ALTER TABLE "Department" DROP COLUMN "headId";

-- AlterTable
ALTER TABLE "Pointage" ADD COLUMN     "lateReason" TEXT;
