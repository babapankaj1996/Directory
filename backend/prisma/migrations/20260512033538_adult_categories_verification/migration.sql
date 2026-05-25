-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "adultLevel" TEXT NOT NULL DEFAULT 'NONE',
ADD COLUMN     "indexable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isAdult" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "minimumAge" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "showOnHomepage" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "adultDisclaimerAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "adultLevel" TEXT NOT NULL DEFAULT 'NONE',
ADD COLUMN     "ageRestricted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isAdult" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "verificationNotes" TEXT,
ADD COLUMN     "verificationStatus" TEXT NOT NULL DEFAULT 'NOT_REQUIRED';

-- CreateTable
CREATE TABLE "ProfileVerificationDocument" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "originalName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "adminNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfileVerificationDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProfileVerificationDocument_profileId_idx" ON "ProfileVerificationDocument"("profileId");

-- CreateIndex
CREATE INDEX "ProfileVerificationDocument_type_idx" ON "ProfileVerificationDocument"("type");

-- CreateIndex
CREATE INDEX "ProfileVerificationDocument_status_idx" ON "ProfileVerificationDocument"("status");

-- CreateIndex
CREATE INDEX "Category_isAdult_idx" ON "Category"("isAdult");

-- CreateIndex
CREATE INDEX "Category_status_isAdult_idx" ON "Category"("status", "isAdult");

-- CreateIndex
CREATE INDEX "Profile_isAdult_idx" ON "Profile"("isAdult");

-- CreateIndex
CREATE INDEX "Profile_verificationStatus_idx" ON "Profile"("verificationStatus");

-- AddForeignKey
ALTER TABLE "ProfileVerificationDocument" ADD CONSTRAINT "ProfileVerificationDocument_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
