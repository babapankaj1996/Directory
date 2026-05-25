ALTER TABLE "ProfileLead" ADD COLUMN "budget" TEXT;
ALTER TABLE "ProfileLead" ADD COLUMN "timeline" TEXT;
ALTER TABLE "ProfileLead" ADD COLUMN "contactPreference" TEXT;
ALTER TABLE "ProfileLead" ADD COLUMN "sourcePath" TEXT;
ALTER TABLE "ProfileLead" ADD COLUMN "leadScore" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ProfileLead" ADD COLUMN "leadQuality" TEXT NOT NULL DEFAULT 'WARM';
ALTER TABLE "ProfileLead" ADD COLUMN "responseAt" TIMESTAMP(3);
ALTER TABLE "ProfileLead" ADD COLUMN "convertedAt" TIMESTAMP(3);
ALTER TABLE "ProfileLead" ADD COLUMN "followUpAt" TIMESTAMP(3);

CREATE INDEX "ProfileLead_leadQuality_idx" ON "ProfileLead"("leadQuality");
CREATE INDEX "ProfileLead_leadScore_idx" ON "ProfileLead"("leadScore");
CREATE INDEX "ProfileLead_sourcePath_idx" ON "ProfileLead"("sourcePath");
CREATE INDEX "ProfileLead_responseAt_idx" ON "ProfileLead"("responseAt");
