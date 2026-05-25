ALTER TABLE "User"
  ADD COLUMN "emailVerified" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "emailVerifyToken" TEXT,
  ADD COLUMN "emailVerifyTokenExpiresAt" TIMESTAMP(3),
  ADD COLUMN "passwordResetToken" TEXT,
  ADD COLUMN "passwordResetTokenExpiresAt" TIMESTAMP(3);

UPDATE "User" SET "emailVerified" = true WHERE "role" IN ('ADMIN', 'OWNER', 'USER');

ALTER TABLE "ProfileReview"
  ADD COLUMN "moderationNote" TEXT,
  ADD COLUMN "ipHash" TEXT,
  ADD COLUMN "userAgentHash" TEXT;

UPDATE "ProfileReview" SET "status" = 'APPROVED' WHERE "status" = 'PUBLISHED';

ALTER TABLE "ProfileReview" ALTER COLUMN "status" SET DEFAULT 'PENDING';

CREATE INDEX "ProfileReview_status_idx" ON "ProfileReview"("status");
CREATE INDEX "ProfileReview_ipHash_idx" ON "ProfileReview"("ipHash");
