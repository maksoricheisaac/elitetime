-- AlterTable
ALTER TABLE "User" ADD COLUMN     "hiddenFromLists" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "HiddenUsername" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "hidden" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HiddenUsername_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HiddenUsername_username_key" ON "HiddenUsername"("username");
