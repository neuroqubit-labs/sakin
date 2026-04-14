-- ============================================================
-- Migration: Expense → Ledger Backfill
-- Bu migration ayrı çalışır çünkü PostgreSQL'de ALTER TYPE ADD VALUE
-- ile aynı transaction'da yeni enum değeri kullanılamaz.
-- ============================================================

INSERT INTO "ledger_entries" (
  "id", "tenantId", "siteId", "unitId", "amount", "currency",
  "entryType", "referenceType", "referenceId", "idempotencyKey",
  "effectiveAt", "createdByUserId", "note", "createdAt"
)
SELECT
  gen_random_uuid(),
  e."tenantId",
  e."siteId",
  NULL,
  e."amount" * -1,
  'TRY',
  'EXPENSE'::"LedgerEntryType",
  'EXPENSE'::"LedgerReferenceType",
  e."id",
  'expense-backfill-' || e."id",
  e."date",
  e."createdById",
  e."description",
  e."createdAt"
FROM "expenses" e
WHERE e."deletedAt" IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM "ledger_entries" l
    WHERE l."idempotencyKey" = 'expense-backfill-' || e."id"
  );
