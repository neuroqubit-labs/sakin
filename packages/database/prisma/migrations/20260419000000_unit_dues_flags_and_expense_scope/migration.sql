-- CreateEnum
CREATE TYPE "ExpensePayerScope" AS ENUM ('ALL', 'OWNERS_ONLY', 'TENANTS_ONLY');

-- AlterTable: Unit
ALTER TABLE "units"
  ADD COLUMN "isStaffQuarters" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "isExemptFromDues" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "customDuesAmount" DECIMAL(12,2);

-- AlterTable: Expense
ALTER TABLE "expenses"
  ADD COLUMN "payerScope" "ExpensePayerScope" NOT NULL DEFAULT 'ALL';
