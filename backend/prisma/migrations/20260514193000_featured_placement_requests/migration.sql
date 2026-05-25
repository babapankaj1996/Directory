-- CreateTable
CREATE TABLE "FeaturedPlacementRequest" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "ownerUserId" TEXT,
    "requestedDays" INTEGER NOT NULL,
    "requestedPage" TEXT NOT NULL,
    "requestedPagePath" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "adminNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeaturedPlacementRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FeaturedPlacementRequest_profileId_idx" ON "FeaturedPlacementRequest"("profileId");

-- CreateIndex
CREATE INDEX "FeaturedPlacementRequest_ownerUserId_idx" ON "FeaturedPlacementRequest"("ownerUserId");

-- CreateIndex
CREATE INDEX "FeaturedPlacementRequest_status_createdAt_idx" ON "FeaturedPlacementRequest"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "FeaturedPlacementRequest" ADD CONSTRAINT "FeaturedPlacementRequest_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeaturedPlacementRequest" ADD CONSTRAINT "FeaturedPlacementRequest_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
