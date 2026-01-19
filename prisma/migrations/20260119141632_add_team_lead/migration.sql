-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'team_lead';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "teamLeadId" TEXT;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_teamLeadId_fkey" FOREIGN KEY ("teamLeadId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
