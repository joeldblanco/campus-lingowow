-- CreateEnum
CREATE TYPE "FinancialMovementDirection" AS ENUM ('INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "FinancialMovementSourceType" AS ENUM (
  'MANUAL',
  'INVOICE',
  'TEACHER_PAYABLE',
  'TEACHER_PAYMENT_CONFIRMATION',
  'TEACHER_INCENTIVE',
  'REFUND',
  'ADJUSTMENT'
);

-- CreateEnum
CREATE TYPE "FinancialMovementStatus" AS ENUM ('DRAFT', 'POSTED', 'VOID');

-- CreateTable
CREATE TABLE "financial_movements" (
  "id" TEXT NOT NULL,
  "direction" "FinancialMovementDirection" NOT NULL,
  "sourceType" "FinancialMovementSourceType" NOT NULL DEFAULT 'MANUAL',
  "sourceId" TEXT,
  "status" "FinancialMovementStatus" NOT NULL DEFAULT 'POSTED',
  "category" TEXT NOT NULL,
  "subcategory" TEXT,
  "description" TEXT NOT NULL,
  "providerName" TEXT,
  "amount" DOUBLE PRECISION NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "baseCurrency" TEXT NOT NULL DEFAULT 'USD',
  "baseAmount" DOUBLE PRECISION NOT NULL,
  "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "netAmount" DOUBLE PRECISION NOT NULL,
  "accrualDate" TIMESTAMP(3) NOT NULL,
  "cashDate" TIMESTAMP(3),
  "notes" TEXT,
  "proofUrl" TEXT,
  "metadata" JSONB,
  "createdById" TEXT,
  "updatedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "financial_movements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "financial_movements_direction_idx" ON "financial_movements"("direction");

-- CreateIndex
CREATE INDEX "financial_movements_sourceType_sourceId_idx" ON "financial_movements"("sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "financial_movements_status_idx" ON "financial_movements"("status");

-- CreateIndex
CREATE INDEX "financial_movements_category_idx" ON "financial_movements"("category");

-- CreateIndex
CREATE INDEX "financial_movements_accrualDate_idx" ON "financial_movements"("accrualDate");

-- CreateIndex
CREATE INDEX "financial_movements_cashDate_idx" ON "financial_movements"("cashDate");

-- CreateIndex
CREATE INDEX "financial_movements_createdById_idx" ON "financial_movements"("createdById");