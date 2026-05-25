-- Extend featured placement requests/campaigns with pricing snapshots.
ALTER TABLE "FeaturedPlacementRequest" ADD COLUMN "placementKey" TEXT;
ALTER TABLE "FeaturedPlacementRequest" ADD COLUMN "placementLabel" TEXT;
ALTER TABLE "FeaturedPlacementRequest" ADD COLUMN "priceAmount" INTEGER;
ALTER TABLE "FeaturedPlacementRequest" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'INR';
ALTER TABLE "FeaturedPlacementRequest" ADD COLUMN "paymentStatus" TEXT NOT NULL DEFAULT 'UNPAID';

ALTER TABLE "FeaturedPlacementCampaign" ADD COLUMN "placementKey" TEXT;
ALTER TABLE "FeaturedPlacementCampaign" ADD COLUMN "placementLabel" TEXT;
ALTER TABLE "FeaturedPlacementCampaign" ADD COLUMN "priceAmount" INTEGER;
ALTER TABLE "FeaturedPlacementCampaign" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'INR';
ALTER TABLE "FeaturedPlacementCampaign" ADD COLUMN "paymentStatus" TEXT NOT NULL DEFAULT 'UNPAID';

-- Single source for admin-managed placement prices. scopeKey prevents duplicate
-- rules for the same page scope, duration and currency.
CREATE TABLE "FeaturedPlacementPrice" (
    "id" TEXT NOT NULL,
    "scopeKey" TEXT NOT NULL,
    "pageType" TEXT NOT NULL,
    "countryId" TEXT,
    "citySlug" TEXT,
    "categoryId" TEXT,
    "durationDays" INTEGER NOT NULL,
    "priceAmount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeaturedPlacementPrice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FeaturedPlacementPrice_scopeKey_durationDays_currency_key" ON "FeaturedPlacementPrice"("scopeKey", "durationDays", "currency");
CREATE INDEX "FeaturedPlacementPrice_pageType_isActive_idx" ON "FeaturedPlacementPrice"("pageType", "isActive");
CREATE INDEX "FeaturedPlacementPrice_countryId_citySlug_categoryId_idx" ON "FeaturedPlacementPrice"("countryId", "citySlug", "categoryId");
