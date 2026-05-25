-- Add approval statuses, gallery support, and admin review history.
CREATE TYPE "ProfileStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');

ALTER TABLE "Profile" DROP CONSTRAINT IF EXISTS "Profile_countryCode_citySlug_fkey";
ALTER TABLE "Profile" DROP CONSTRAINT IF EXISTS "Profile_countryCode_fkey";
ALTER TABLE "Profile" DROP CONSTRAINT IF EXISTS "Profile_categorySlug_fkey";

DROP INDEX IF EXISTS "Profile_countryCode_citySlug_categorySlug_slug_key";
DROP INDEX IF EXISTS "Profile_countryCode_citySlug_idx";
DROP INDEX IF EXISTS "Profile_categorySlug_idx";
DROP INDEX IF EXISTS "Profile_featured_idx";
DROP INDEX IF EXISTS "Profile_verified_idx";

ALTER TABLE "Profile" RENAME COLUMN "countryCode" TO "countryId";
ALTER TABLE "Profile" RENAME COLUMN "categorySlug" TO "categoryId";
ALTER TABLE "Profile" RENAME COLUMN "about" TO "description";
ALTER TABLE "Profile" RENAME COLUMN "reviews" TO "reviewCount";
ALTER TABLE "Profile" RENAME COLUMN "featured" TO "isFeatured";
ALTER TABLE "Profile" RENAME COLUMN "image" TO "coverImage";
ALTER TABLE "Profile" RENAME COLUMN "email" TO "ownerEmail";
ALTER TABLE "Profile" RENAME COLUMN "hours" TO "businessHours";
ALTER TABLE "Profile" RENAME COLUMN "seoDesc" TO "seoDescription";

ALTER TABLE "Profile"
  ADD COLUMN "shortDescription" TEXT,
  ADD COLUMN "ownerName" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "whatsapp" TEXT,
  ADD COLUMN "address" TEXT,
  ADD COLUMN "cityId" TEXT,
  ADD COLUMN "featuredUntil" TIMESTAMP(3),
  ADD COLUMN "rejectionReason" TEXT,
  ADD COLUMN "adminNotes" TEXT,
  ADD COLUMN "avatarImage" TEXT,
  ADD COLUMN "pricing" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN "statusNew" "ProfileStatus" NOT NULL DEFAULT 'PENDING';

UPDATE "Profile"
SET
  "cityId" = "City"."id",
  "address" = COALESCE("Profile"."location", "City"."name"),
  "ownerName" = COALESCE(NULLIF("Profile"."name", ''), 'Business Owner'),
  "shortDescription" = LEFT("Profile"."description", 180),
  "statusNew" = CASE
    WHEN UPPER("Profile"."status") IN ('APPROVED', 'PUBLISHED', 'ACTIVE') THEN 'APPROVED'::"ProfileStatus"
    WHEN UPPER("Profile"."status") IN ('REJECTED') THEN 'REJECTED'::"ProfileStatus"
    WHEN UPPER("Profile"."status") IN ('SUSPENDED') THEN 'SUSPENDED'::"ProfileStatus"
    ELSE 'PENDING'::"ProfileStatus"
  END
FROM "City"
WHERE "City"."countryCode" = "Profile"."countryId"
  AND "City"."slug" = "Profile"."citySlug";

ALTER TABLE "Profile" DROP COLUMN "status";
ALTER TABLE "Profile" RENAME COLUMN "statusNew" TO "status";

ALTER TABLE "Profile"
  DROP COLUMN "categoryName",
  DROP COLUMN "citySlug",
  DROP COLUMN "cityName",
  DROP COLUMN "location",
  DROP COLUMN "verified",
  DROP COLUMN "open";

UPDATE "Profile"
SET "cityId" = (
  SELECT "City"."id"
  FROM "City"
  WHERE "City"."countryCode" = "Profile"."countryId"
  ORDER BY "City"."createdAt" ASC
  LIMIT 1
)
WHERE "cityId" IS NULL;

ALTER TABLE "Profile"
  ALTER COLUMN "cityId" SET NOT NULL,
  ALTER COLUMN "ownerName" DROP DEFAULT,
  ALTER COLUMN "coverImage" DROP NOT NULL;

CREATE TABLE "ProfileGallery" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "imageUrl" TEXT NOT NULL,
  "title" TEXT,
  "altText" TEXT,
  "category" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ProfileGallery_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProfileStatusHistory" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "oldStatus" "ProfileStatus",
  "newStatus" "ProfileStatus" NOT NULL,
  "reason" TEXT,
  "adminNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ProfileStatusHistory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Profile_countryId_cityId_categoryId_slug_key" ON "Profile"("countryId", "cityId", "categoryId", "slug");
CREATE INDEX "Profile_countryId_cityId_idx" ON "Profile"("countryId", "cityId");
CREATE INDEX "Profile_categoryId_idx" ON "Profile"("categoryId");
CREATE INDEX "Profile_status_idx" ON "Profile"("status");
CREATE INDEX "Profile_isFeatured_idx" ON "Profile"("isFeatured");
CREATE INDEX "ProfileGallery_profileId_idx" ON "ProfileGallery"("profileId");
CREATE INDEX "ProfileGallery_category_idx" ON "ProfileGallery"("category");
CREATE INDEX "ProfileGallery_isActive_idx" ON "ProfileGallery"("isActive");
CREATE INDEX "ProfileStatusHistory_profileId_idx" ON "ProfileStatusHistory"("profileId");
CREATE INDEX "ProfileStatusHistory_newStatus_idx" ON "ProfileStatusHistory"("newStatus");

ALTER TABLE "Profile" ADD CONSTRAINT "Profile_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("slug") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProfileGallery" ADD CONSTRAINT "ProfileGallery_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProfileStatusHistory" ADD CONSTRAINT "ProfileStatusHistory_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
