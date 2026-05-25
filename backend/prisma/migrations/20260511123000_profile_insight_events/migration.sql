-- CreateTable
CREATE TABLE "ProfileInsightEvent" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "referrer" TEXT,
    "ipHash" TEXT,
    "userAgentHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfileInsightEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProfileInsightEvent_profileId_idx" ON "ProfileInsightEvent"("profileId");

-- CreateIndex
CREATE INDEX "ProfileInsightEvent_type_idx" ON "ProfileInsightEvent"("type");

-- CreateIndex
CREATE INDEX "ProfileInsightEvent_createdAt_idx" ON "ProfileInsightEvent"("createdAt");

-- CreateIndex
CREATE INDEX "ProfileInsightEvent_profileId_type_createdAt_idx" ON "ProfileInsightEvent"("profileId", "type", "createdAt");

-- AddForeignKey
ALTER TABLE "ProfileInsightEvent" ADD CONSTRAINT "ProfileInsightEvent_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
