-- AlterTable
ALTER TABLE "ProfileLead" ADD COLUMN     "userId" TEXT;

-- CreateIndex
CREATE INDEX "ProfileLead_userId_idx" ON "ProfileLead"("userId");

-- AddForeignKey
ALTER TABLE "ProfileLead" ADD CONSTRAINT "ProfileLead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
