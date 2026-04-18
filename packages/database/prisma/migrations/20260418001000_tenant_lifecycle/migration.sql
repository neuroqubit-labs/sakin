-- Tenant lifecycle: suspend metadata + activity notes
ALTER TABLE "tenants" ADD COLUMN "suspendedAt" TIMESTAMP(3);
ALTER TABLE "tenants" ADD COLUMN "suspendedReason" TEXT;
ALTER TABLE "tenants" ADD COLUMN "suspendedBy" TEXT;
ALTER TABLE "tenants" ADD COLUMN "activityNotes" TEXT;
