-- CreateTable
CREATE TABLE "FeaturedPlacementCampaign" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "ownerUserId" TEXT,
    "requestId" TEXT,
    "pageType" TEXT NOT NULL,
    "pagePath" TEXT NOT NULL,
    "slot" TEXT NOT NULL DEFAULT 'TOP',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "adminNote" TEXT,
    "source" TEXT NOT NULL DEFAULT 'REQUEST',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeaturedPlacementCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FeaturedPlacementCampaign_profileId_status_idx" ON "FeaturedPlacementCampaign"("profileId", "status");

-- CreateIndex
CREATE INDEX "FeaturedPlacementCampaign_ownerUserId_idx" ON "FeaturedPlacementCampaign"("ownerUserId");

-- CreateIndex
CREATE INDEX "FeaturedPlacementCampaign_requestId_idx" ON "FeaturedPlacementCampaign"("requestId");

-- CreateIndex
CREATE INDEX "FeaturedPlacementCampaign_pagePath_status_startsAt_endsAt_idx" ON "FeaturedPlacementCampaign"("pagePath", "status", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "FeaturedPlacementCampaign_pageType_status_idx" ON "FeaturedPlacementCampaign"("pageType", "status");

-- AddForeignKey
ALTER TABLE "FeaturedPlacementCampaign" ADD CONSTRAINT "FeaturedPlacementCampaign_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeaturedPlacementCampaign" ADD CONSTRAINT "FeaturedPlacementCampaign_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeaturedPlacementCampaign" ADD CONSTRAINT "FeaturedPlacementCampaign_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "FeaturedPlacementRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
