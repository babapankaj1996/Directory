-- Restore indexes intentionally used by the lead quality dashboard.
CREATE INDEX IF NOT EXISTS "ProfileLead_leadQuality_idx" ON "ProfileLead"("leadQuality");
CREATE INDEX IF NOT EXISTS "ProfileLead_leadScore_idx" ON "ProfileLead"("leadScore");
CREATE INDEX IF NOT EXISTS "ProfileLead_sourcePath_idx" ON "ProfileLead"("sourcePath");
CREATE INDEX IF NOT EXISTS "ProfileLead_responseAt_idx" ON "ProfileLead"("responseAt");
