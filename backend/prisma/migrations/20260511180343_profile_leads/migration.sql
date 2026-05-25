-- CreateEnum
CREATE TYPE "ProfileLeadStatus" AS ENUM ('NEW', 'CONTACTED', 'CONVERTED', 'LOST', 'SPAM');

-- CreateTable
CREATE TABLE "ProfileLead" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT NOT NULL,
    "whatsapp" TEXT,
    "serviceNeeded" TEXT,
    "preferredDate" TIMESTAMP(3),
    "preferredTime" TEXT,
    "message" TEXT,
    "source" TEXT NOT NULL DEFAULT 'PROFILE_QUOTE',
    "status" "ProfileLeadStatus" NOT NULL DEFAULT 'NEW',
    "ownerNote" TEXT,
    "adminNote" TEXT,
    "ipHash" TEXT,
    "userAgentHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfileLead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProfileLead_profileId_idx" ON "ProfileLead"("profileId");

-- CreateIndex
CREATE INDEX "ProfileLead_status_idx" ON "ProfileLead"("status");

-- CreateIndex
CREATE INDEX "ProfileLead_createdAt_idx" ON "ProfileLead"("createdAt");

-- CreateIndex
CREATE INDEX "ProfileLead_profileId_status_createdAt_idx" ON "ProfileLead"("profileId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "ProfileLead_ipHash_idx" ON "ProfileLead"("ipHash");

-- AddForeignKey
ALTER TABLE "ProfileLead" ADD CONSTRAINT "ProfileLead_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
