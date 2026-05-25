ALTER TABLE "Profile" ADD COLUMN "ownerUserId" TEXT;

CREATE TABLE "ProfileReview" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "rating" INTEGER NOT NULL,
  "title" TEXT,
  "comment" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProfileReview_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Profile_ownerUserId_idx" ON "Profile"("ownerUserId");
CREATE UNIQUE INDEX "ProfileReview_profileId_userId_key" ON "ProfileReview"("profileId", "userId");
CREATE INDEX "ProfileReview_profileId_status_idx" ON "ProfileReview"("profileId", "status");
CREATE INDEX "ProfileReview_userId_idx" ON "ProfileReview"("userId");

ALTER TABLE "Profile" ADD CONSTRAINT "Profile_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProfileReview" ADD CONSTRAINT "ProfileReview_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProfileReview" ADD CONSTRAINT "ProfileReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
