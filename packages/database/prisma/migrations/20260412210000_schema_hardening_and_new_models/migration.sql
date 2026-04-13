-- ============================================================
-- Migration: schema_hardening_and_new_models
-- Faz 1: FK düzeltmeleri, soft-delete, index'ler, dedup
-- Faz 3: CashAccount, CashTransaction, SiteStaff modelleri
-- Faz 4: Cascade kuralları, Dues unique constraint
-- ============================================================

-- 1. Yeni enum tipleri
CREATE TYPE "CashAccountType" AS ENUM ('CASH', 'BANK');
CREATE TYPE "CashTransactionType" AS ENUM ('INCOME', 'EXPENSE', 'TRANSFER');
CREATE TYPE "CashReferenceType" AS ENUM ('PAYMENT', 'EXPENSE', 'MANUAL');
CREATE TYPE "SiteStaffRole" AS ENUM ('CLEANING', 'SECURITY', 'MAINTENANCE', 'MANAGEMENT', 'OTHER');

-- 2. Announcement — soft-delete + FK
ALTER TABLE "announcements" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 3. Expense — soft-delete + FK
ALTER TABLE "expenses" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 4. Block — tenant FK
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 5. Cascade kuralları — createdByUser alanları SetNull olmalı
ALTER TABLE "unit_occupancies" DROP CONSTRAINT IF EXISTS "unit_occupancies_createdByUserId_fkey";
ALTER TABLE "unit_occupancies" ADD CONSTRAINT "unit_occupancies_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ledger_entries" DROP CONSTRAINT IF EXISTS "ledger_entries_createdByUserId_fkey";
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "export_batches" DROP CONSTRAINT IF EXISTS "export_batches_requestedByUserId_fkey";
ALTER TABLE "export_batches" ADD CONSTRAINT "export_batches_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "notifications" DROP CONSTRAINT IF EXISTS "notifications_sentByUserId_fkey";
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_sentByUserId_fkey" FOREIGN KEY ("sentByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 6. Announcement.site → SetNull cascade
ALTER TABLE "announcements" DROP CONSTRAINT IF EXISTS "announcements_siteId_fkey";
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 7. Dues unique constraint değişikliği (AIDAT + EXTRA aynı ay için izin ver)
ALTER TABLE "dues" DROP CONSTRAINT IF EXISTS "dues_unitId_periodMonth_periodYear_key";
ALTER TABLE "dues" ADD CONSTRAINT "dues_unitId_duesDefinitionId_periodMonth_periodYear_key" UNIQUE ("unitId", "duesDefinitionId", "periodMonth", "periodYear");

-- 8. Composite index'ler
CREATE INDEX "announcements_tenantId_publishedAt_idx" ON "announcements"("tenantId", "publishedAt");
CREATE INDEX "blocks_tenantId_siteId_idx" ON "blocks"("tenantId", "siteId");
CREATE INDEX "payment_attempts_tenantId_unitId_status_idx" ON "payment_attempts"("tenantId", "unitId", "status");
CREATE INDEX "unit_occupancies_residentId_isActive_startDate_idx" ON "unit_occupancies"("residentId", "isActive", "startDate");

-- 9. Manuel ödeme dedup — partial unique index
CREATE UNIQUE INDEX "payment_manual_dedup"
ON "payments" ("tenantId", "unitId", "duesId", "amount", "method")
WHERE "provider" = 'MANUAL' AND "status" IN ('PENDING', 'CONFIRMED');

-- 10. CashAccount tablosu
CREATE TABLE "cash_accounts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CashAccountType" NOT NULL,
    "bankName" TEXT,
    "iban" TEXT,
    "balance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cash_accounts_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "cash_accounts" ADD CONSTRAINT "cash_accounts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cash_accounts" ADD CONSTRAINT "cash_accounts_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "cash_accounts_tenantId_siteId_name_key" ON "cash_accounts"("tenantId", "siteId", "name");
CREATE INDEX "cash_accounts_tenantId_siteId_idx" ON "cash_accounts"("tenantId", "siteId");

-- 11. CashTransaction tablosu
CREATE TABLE "cash_transactions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "cashAccountId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "type" "CashTransactionType" NOT NULL,
    "referenceType" "CashReferenceType",
    "referenceId" TEXT,
    "description" TEXT NOT NULL,
    "transactionDate" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cash_transactions_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "cash_transactions" ADD CONSTRAINT "cash_transactions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cash_transactions" ADD CONSTRAINT "cash_transactions_cashAccountId_fkey" FOREIGN KEY ("cashAccountId") REFERENCES "cash_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cash_transactions" ADD CONSTRAINT "cash_transactions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "cash_transactions_tenantId_cashAccountId_transactionDate_idx" ON "cash_transactions"("tenantId", "cashAccountId", "transactionDate");

-- 12. SiteStaff tablosu
CREATE TABLE "site_staff" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "role" "SiteStaffRole" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_staff_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "site_staff" ADD CONSTRAINT "site_staff_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "site_staff" ADD CONSTRAINT "site_staff_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "site_staff_tenantId_siteId_idx" ON "site_staff"("tenantId", "siteId");
