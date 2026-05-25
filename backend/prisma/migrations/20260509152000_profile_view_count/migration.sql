ALTER TABLE "Profile" ADD COLUMN "viewCount" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "Profile_viewCount_idx" ON "Profile"("viewCount");
