ALTER TABLE "ProfileLead" ALTER COLUMN "leadScore" SET DEFAULT 45;
UPDATE "ProfileLead"
SET "leadScore" = 45,
    "leadQuality" = 'WARM'
WHERE "leadScore" = 0;
