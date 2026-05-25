-- CreateTable
CREATE TABLE "ProfileSave" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfileSave_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProfileSave_profileId_userId_key" ON "ProfileSave"("profileId", "userId");

-- CreateIndex
CREATE INDEX "ProfileSave_profileId_idx" ON "ProfileSave"("profileId");

-- CreateIndex
CREATE INDEX "ProfileSave_userId_idx" ON "ProfileSave"("userId");

-- CreateIndex
CREATE INDEX "ProfileSave_createdAt_idx" ON "ProfileSave"("createdAt");

-- AddForeignKey
ALTER TABLE "ProfileSave" ADD CONSTRAINT "ProfileSave_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileSave" ADD CONSTRAINT "ProfileSave_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
