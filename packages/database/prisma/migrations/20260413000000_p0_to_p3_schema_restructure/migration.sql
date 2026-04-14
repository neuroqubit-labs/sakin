-- ============================================================
-- Migration: P0 → P3 Schema Restructure
-- Date: 2026-04-13
-- Description: Kapsamlı veritabanı yeniden yapılandırması
--   P0: Veri bütünlüğü düzeltmeleri
--   P1: Yapısal iyileştirmeler + Vendor modeli
--   P2: Eksik domain modelleri
--   P3: Gelecek hazırlığı
-- ============================================================

-- ============================================================
-- P0.1: Dues unique constraint düzeltmesi
-- PostgreSQL'de NULL != NULL olduğu için mevcut @@unique yanlış çalışıyordu
-- ============================================================

ALTER TABLE "dues" DROP CONSTRAINT IF EXISTS "dues_unitId_duesDefinitionId_periodMonth_periodYear_key";

-- Policy-based aidat: aynı daire + policy + dönem → tek kayıt
CREATE UNIQUE INDEX "dues_unit_def_period_uq"
ON "dues" ("unitId", "duesDefinitionId", "periodMonth", "periodYear")
WHERE "duesDefinitionId" IS NOT NULL;

-- Ad-hoc aidat: aynı daire + dönem → tek kayıt (duesDefinitionId IS NULL)
CREATE UNIQUE INDEX "dues_unit_adhoc_period_uq"
ON "dues" ("unitId", "periodMonth", "periodYear")
WHERE "duesDefinitionId" IS NULL;

-- ============================================================
-- P0.2: Expense → Ledger entegrasyonu
-- LedgerEntry.unitId optional, siteId eklendi
-- ============================================================

ALTER TYPE "LedgerEntryType" ADD VALUE 'EXPENSE';
ALTER TYPE "LedgerReferenceType" ADD VALUE 'EXPENSE';

ALTER TABLE "ledger_entries" ALTER COLUMN "unitId" DROP NOT NULL;

ALTER TABLE "ledger_entries" ADD COLUMN "siteId" TEXT;

ALTER TABLE "ledger_entries"
  ADD CONSTRAINT "ledger_entries_siteId_fkey"
  FOREIGN KEY ("siteId") REFERENCES "sites"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "ledger_entries_tenantId_siteId_effectiveAt_idx"
ON "ledger_entries" ("tenantId", "siteId", "effectiveAt");

-- NOTE: Expense → Ledger backfill ayrı migration'da yapılıyor
-- (ALTER TYPE ADD VALUE ile aynı transaction'da yeni enum değeri kullanılamaz)

-- ============================================================
-- P0.3: CashAccount.balance kaldırıldı
-- Balance artık cash_transactions'dan hesaplanır
-- ============================================================

ALTER TABLE "cash_accounts" DROP COLUMN IF EXISTS "balance";

-- ============================================================
-- P0.4: Unit → Tenant FK ilişkisi
-- FK zaten init migration'dan var, bu sadece Prisma schema sync
-- ============================================================

-- Prisma schema-level change only (FK already exists in DB from init migration)
-- No SQL needed if FK already present; otherwise:
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'units_tenantId_fkey'
    AND table_name = 'units'
  ) THEN
    ALTER TABLE "units"
      ADD CONSTRAINT "units_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "tenants"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END$$;

-- ============================================================
-- P1.1: Resident.userId global unique → per-tenant unique
-- ============================================================

ALTER TABLE "residents" DROP CONSTRAINT IF EXISTS "residents_userId_key";

-- Partial unique: aynı kullanıcı aynı tenant'ta tek resident profili
CREATE UNIQUE INDEX "residents_userId_tenantId_key"
ON "residents" ("userId", "tenantId")
WHERE "userId" IS NOT NULL;

-- ============================================================
-- P1.2: SiteStaff → User bağlantısı
-- ============================================================

ALTER TABLE "site_staff" ADD COLUMN "userId" TEXT;

ALTER TABLE "site_staff"
  ADD CONSTRAINT "site_staff_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "site_staff_userId_siteId_key"
ON "site_staff" ("userId", "siteId")
WHERE "userId" IS NOT NULL;

-- ============================================================
-- P1.3: Enum genişletmeleri
-- ============================================================

-- UnitType
ALTER TYPE "UnitType" ADD VALUE 'GARDEN_FLOOR';
ALTER TYPE "UnitType" ADD VALUE 'PENTHOUSE';
ALTER TYPE "UnitType" ADD VALUE 'DUPLEX';
ALTER TYPE "UnitType" ADD VALUE 'OFFICE';

-- DuesType
ALTER TYPE "DuesType" ADD VALUE 'YAKACAK';
ALTER TYPE "DuesType" ADD VALUE 'ASANSOR';
ALTER TYPE "DuesType" ADD VALUE 'ONARIM';
ALTER TYPE "DuesType" ADD VALUE 'ISLETME';
ALTER TYPE "DuesType" ADD VALUE 'OTOPARK';
ALTER TYPE "DuesType" ADD VALUE 'ORTAK_ALAN';
ALTER TYPE "DuesType" ADD VALUE 'AIDAT_FARKI';
ALTER TYPE "DuesType" ADD VALUE 'DIGER';

-- ExpenseCategory
ALTER TYPE "ExpenseCategory" ADD VALUE 'ELEVATOR';
ALTER TYPE "ExpenseCategory" ADD VALUE 'HEATING_FUEL';
ALTER TYPE "ExpenseCategory" ADD VALUE 'WATER';
ALTER TYPE "ExpenseCategory" ADD VALUE 'ELECTRICITY';
ALTER TYPE "ExpenseCategory" ADD VALUE 'NATURAL_GAS';
ALTER TYPE "ExpenseCategory" ADD VALUE 'GARDEN';
ALTER TYPE "ExpenseCategory" ADD VALUE 'PEST_CONTROL';
ALTER TYPE "ExpenseCategory" ADD VALUE 'POOL';
ALTER TYPE "ExpenseCategory" ADD VALUE 'LEGAL';
ALTER TYPE "ExpenseCategory" ADD VALUE 'TAXES';
ALTER TYPE "ExpenseCategory" ADD VALUE 'STAFF_SALARY';
ALTER TYPE "ExpenseCategory" ADD VALUE 'RENOVATION';
ALTER TYPE "ExpenseCategory" ADD VALUE 'EQUIPMENT';
ALTER TYPE "ExpenseCategory" ADD VALUE 'COMMUNICATION';

-- ============================================================
-- P1.4: Vendor (Tedarikçi) modeli
-- ============================================================

CREATE TABLE "vendors" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "taxNumber" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "address" TEXT,
  "category" "ExpenseCategory",
  "iban" TEXT,
  "contactName" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "vendors"
  ADD CONSTRAINT "vendors_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "vendors_tenantId_name_key" ON "vendors" ("tenantId", "name");
CREATE INDEX "vendors_tenantId_idx" ON "vendors" ("tenantId");

-- Expense → Vendor FK
ALTER TABLE "expenses" ADD COLUMN "vendorId" TEXT;

ALTER TABLE "expenses"
  ADD CONSTRAINT "expenses_vendorId_fkey"
  FOREIGN KEY ("vendorId") REFERENCES "vendors"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "expenses_vendorId_idx" ON "expenses" ("vendorId");

-- ============================================================
-- P2 yeni enum türleri
-- ============================================================

CREATE TYPE "TicketCategory" AS ENUM (
  'ELEVATOR', 'PLUMBING', 'ELECTRICAL', 'CLEANING', 'HEATING',
  'SECURITY', 'PARKING', 'GARDEN', 'COMMON_AREA', 'NOISE', 'PEST', 'OTHER'
);

CREATE TYPE "TicketPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

CREATE TYPE "TicketStatus" AS ENUM (
  'OPEN', 'ASSIGNED', 'IN_PROGRESS', 'WAITING', 'RESOLVED', 'CLOSED', 'CANCELLED'
);

CREATE TYPE "LegalCaseStage" AS ENUM (
  'WARNING_SENT', 'LEGAL_NOTICE', 'LAWSUIT_FILED', 'JUDGMENT', 'ENFORCEMENT', 'SETTLED', 'CANCELLED'
);

CREATE TYPE "LegalCaseStatus" AS ENUM ('ACTIVE', 'SETTLED', 'CANCELLED');

CREATE TYPE "DocumentOwnerType" AS ENUM (
  'SITE', 'UNIT', 'TICKET', 'CONTRACT', 'LEGAL_CASE', 'EXPENSE', 'MEETING'
);

CREATE TYPE "DocumentType" AS ENUM (
  'RECEIPT', 'INVOICE', 'CONTRACT', 'INSURANCE', 'MEETING_MINUTES', 'PHOTO', 'REPORT', 'LEGAL', 'OTHER'
);

CREATE TYPE "ContractStatus" AS ENUM ('DRAFT', 'ACTIVE', 'EXPIRED', 'CANCELLED', 'RENEWED');

CREATE TYPE "CommunicationChannel" AS ENUM ('SMS', 'WHATSAPP', 'EMAIL');

CREATE TYPE "CommunicationStatus" AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'FAILED', 'BOUNCED');

-- ============================================================
-- P2.1: Ticket (Arıza/Talep) modeli
-- ============================================================

CREATE TABLE "tickets" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "siteId" TEXT NOT NULL,
  "unitId" TEXT,
  "reportedById" TEXT,
  "assignedToId" TEXT,
  "category" "TicketCategory" NOT NULL,
  "priority" "TicketPriority" NOT NULL DEFAULT 'MEDIUM',
  "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
  "title" VARCHAR(200) NOT NULL,
  "description" TEXT NOT NULL,
  "resolution" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "closedAt" TIMESTAMP(3),
  "dueDate" TIMESTAMP(3),
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "tickets" ADD CONSTRAINT "tickets_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "site_staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "tickets_tenantId_idx" ON "tickets" ("tenantId");
CREATE INDEX "tickets_tenantId_siteId_status_idx" ON "tickets" ("tenantId", "siteId", "status");
CREATE INDEX "tickets_tenantId_assignedToId_status_idx" ON "tickets" ("tenantId", "assignedToId", "status");

CREATE TABLE "ticket_comments" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "ticketId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "isInternal" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ticket_comments_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ticket_comments" ADD CONSTRAINT "ticket_comments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ticket_comments" ADD CONSTRAINT "ticket_comments_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ticket_comments" ADD CONSTRAINT "ticket_comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "ticket_comments_tenantId_ticketId_idx" ON "ticket_comments" ("tenantId", "ticketId");

-- ============================================================
-- P2.2: LegalCase (İcra/Takip) modeli
-- ============================================================

CREATE TABLE "legal_cases" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "siteId" TEXT NOT NULL,
  "unitId" TEXT NOT NULL,
  "residentId" TEXT NOT NULL,
  "stage" "LegalCaseStage" NOT NULL DEFAULT 'WARNING_SENT',
  "status" "LegalCaseStatus" NOT NULL DEFAULT 'ACTIVE',
  "totalDebt" DECIMAL(12,2) NOT NULL,
  "interestRate" DECIMAL(5,2),
  "collectedAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "lawyerName" TEXT,
  "lawyerPhone" TEXT,
  "caseNumber" TEXT,
  "courtName" TEXT,
  "filedAt" TIMESTAMP(3),
  "settledAt" TIMESTAMP(3),
  "note" TEXT,
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "legal_cases_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "legal_cases" ADD CONSTRAINT "legal_cases_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "legal_cases" ADD CONSTRAINT "legal_cases_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "legal_cases" ADD CONSTRAINT "legal_cases_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "legal_cases" ADD CONSTRAINT "legal_cases_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "residents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "legal_cases_tenantId_idx" ON "legal_cases" ("tenantId");
CREATE INDEX "legal_cases_tenantId_siteId_status_idx" ON "legal_cases" ("tenantId", "siteId", "status");
CREATE INDEX "legal_cases_tenantId_residentId_idx" ON "legal_cases" ("tenantId", "residentId");
CREATE INDEX "legal_cases_status_idx" ON "legal_cases" ("status");

CREATE TABLE "legal_case_events" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "legalCaseId" TEXT NOT NULL,
  "stage" "LegalCaseStage" NOT NULL,
  "description" TEXT NOT NULL,
  "eventDate" TIMESTAMP(3) NOT NULL,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "legal_case_events_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "legal_case_events" ADD CONSTRAINT "legal_case_events_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "legal_case_events" ADD CONSTRAINT "legal_case_events_legalCaseId_fkey" FOREIGN KEY ("legalCaseId") REFERENCES "legal_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "legal_case_events" ADD CONSTRAINT "legal_case_events_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "legal_case_events_tenantId_legalCaseId_idx" ON "legal_case_events" ("tenantId", "legalCaseId");

-- ============================================================
-- P2.3: Document (Belge Yönetimi — Polymorphic)
-- ============================================================

CREATE TABLE "documents" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "ownerType" "DocumentOwnerType" NOT NULL,
  "ownerId" TEXT NOT NULL,
  "type" "DocumentType" NOT NULL DEFAULT 'OTHER',
  "fileName" TEXT NOT NULL,
  "fileUrl" TEXT NOT NULL,
  "fileSize" INTEGER,
  "mimeType" TEXT,
  "description" TEXT,
  "uploadedById" TEXT,
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "documents" ADD CONSTRAINT "documents_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "documents_tenantId_idx" ON "documents" ("tenantId");
CREATE INDEX "documents_tenantId_ownerType_ownerId_idx" ON "documents" ("tenantId", "ownerType", "ownerId");

-- ============================================================
-- P2.4: Contract (Sözleşme Yönetimi)
-- ============================================================

CREATE TABLE "contracts" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "siteId" TEXT NOT NULL,
  "vendorId" TEXT,
  "title" VARCHAR(200) NOT NULL,
  "description" TEXT,
  "status" "ContractStatus" NOT NULL DEFAULT 'DRAFT',
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3) NOT NULL,
  "amount" DECIMAL(12,2),
  "currency" TEXT NOT NULL DEFAULT 'TRY',
  "renewalDate" TIMESTAMP(3),
  "autoRenew" BOOLEAN NOT NULL DEFAULT false,
  "createdById" TEXT,
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "contracts" ADD CONSTRAINT "contracts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "contracts_tenantId_idx" ON "contracts" ("tenantId");
CREATE INDEX "contracts_tenantId_siteId_status_idx" ON "contracts" ("tenantId", "siteId", "status");
CREATE INDEX "contracts_endDate_idx" ON "contracts" ("endDate");

-- Expense → Contract FK
ALTER TABLE "expenses" ADD COLUMN "contractId" TEXT;

ALTER TABLE "expenses"
  ADD CONSTRAINT "expenses_contractId_fkey"
  FOREIGN KEY ("contractId") REFERENCES "contracts"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================
-- P2.5: CommunicationLog (İletişim Kaydı)
-- ============================================================

CREATE TABLE "communication_logs" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "siteId" TEXT,
  "recipientPhone" TEXT,
  "recipientEmail" TEXT,
  "residentId" TEXT,
  "channel" "CommunicationChannel" NOT NULL,
  "status" "CommunicationStatus" NOT NULL DEFAULT 'QUEUED',
  "templateKey" TEXT,
  "subject" TEXT,
  "body" TEXT NOT NULL,
  "providerMsgId" TEXT,
  "sentAt" TIMESTAMP(3),
  "deliveredAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "errorMessage" TEXT,
  "metadata" JSONB,
  "sentByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "communication_logs_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "communication_logs" ADD CONSTRAINT "communication_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "communication_logs" ADD CONSTRAINT "communication_logs_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "communication_logs" ADD CONSTRAINT "communication_logs_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "residents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "communication_logs" ADD CONSTRAINT "communication_logs_sentByUserId_fkey" FOREIGN KEY ("sentByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "communication_logs_tenantId_idx" ON "communication_logs" ("tenantId");
CREATE INDEX "communication_logs_tenantId_channel_status_idx" ON "communication_logs" ("tenantId", "channel", "status");
CREATE INDEX "communication_logs_tenantId_residentId_idx" ON "communication_logs" ("tenantId", "residentId");
CREATE INDEX "communication_logs_sentAt_idx" ON "communication_logs" ("sentAt");

-- ============================================================
-- P3.1: Facility (Ortak Alan/Tesis)
-- ============================================================

CREATE TYPE "FacilityType" AS ENUM (
  'POOL', 'GYM', 'PARKING_LOT', 'GENERATOR', 'PLAYGROUND',
  'MEETING_ROOM', 'SAUNA', 'GARDEN', 'ELEVATOR', 'SECURITY_BOOTH', 'OTHER'
);

CREATE TABLE "facilities" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "siteId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" "FacilityType" NOT NULL,
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "facilities_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "facilities" ADD CONSTRAINT "facilities_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "facilities" ADD CONSTRAINT "facilities_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "facilities_tenantId_siteId_name_key" ON "facilities" ("tenantId", "siteId", "name");
CREATE INDEX "facilities_tenantId_siteId_idx" ON "facilities" ("tenantId", "siteId");

-- ============================================================
-- P3.2: Meeting / MeetingDecision (Kat Malikleri Toplantısı)
-- ============================================================

CREATE TYPE "MeetingType" AS ENUM ('ORDINARY', 'EXTRAORDINARY');
CREATE TYPE "MeetingStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
CREATE TYPE "DecisionResult" AS ENUM ('APPROVED', 'REJECTED', 'POSTPONED');

CREATE TABLE "meetings" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "siteId" TEXT NOT NULL,
  "type" "MeetingType" NOT NULL,
  "status" "MeetingStatus" NOT NULL DEFAULT 'PLANNED',
  "title" VARCHAR(200) NOT NULL,
  "agenda" TEXT,
  "date" TIMESTAMP(3) NOT NULL,
  "location" TEXT,
  "quorumMet" BOOLEAN,
  "attendeeCount" INTEGER,
  "totalUnits" INTEGER,
  "minutesUrl" TEXT,
  "createdById" TEXT,
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "meetings_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "meetings" ADD CONSTRAINT "meetings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "meetings_tenantId_idx" ON "meetings" ("tenantId");
CREATE INDEX "meetings_tenantId_siteId_date_idx" ON "meetings" ("tenantId", "siteId", "date");

CREATE TABLE "meeting_decisions" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "meetingId" TEXT NOT NULL,
  "orderNumber" INTEGER NOT NULL,
  "subject" TEXT NOT NULL,
  "description" TEXT,
  "result" "DecisionResult" NOT NULL,
  "votesFor" INTEGER,
  "votesAgainst" INTEGER,
  "votesAbstain" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "meeting_decisions_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "meeting_decisions" ADD CONSTRAINT "meeting_decisions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "meeting_decisions" ADD CONSTRAINT "meeting_decisions_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "meeting_decisions_meetingId_orderNumber_key" ON "meeting_decisions" ("meetingId", "orderNumber");
CREATE INDEX "meeting_decisions_tenantId_meetingId_idx" ON "meeting_decisions" ("tenantId", "meetingId");

-- ============================================================
-- P3.3: Notification iyileştirmeleri
-- ============================================================

ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "title" TEXT;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "body" TEXT;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "readAt" TIMESTAMP(3);

CREATE INDEX "notifications_tenantId_userId_readAt_idx"
ON "notifications" ("tenantId", "userId", "readAt");

-- NotificationPreference modeli
CREATE TABLE "notification_preferences" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "channel" "NotificationChannel" NOT NULL,
  "category" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "notification_preferences_userId_tenantId_channel_category_key"
ON "notification_preferences" ("userId", "tenantId", "channel", "category");

CREATE INDEX "notification_preferences_tenantId_userId_idx"
ON "notification_preferences" ("tenantId", "userId");

-- ============================================================
-- P3.4: Payment.purpose alanı
-- ============================================================

CREATE TYPE "PaymentPurpose" AS ENUM ('DUES', 'ADVANCE', 'OVERPAYMENT', 'LEGAL', 'OTHER');

ALTER TABLE "payments" ADD COLUMN "purpose" "PaymentPurpose" NOT NULL DEFAULT 'DUES';
