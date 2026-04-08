CREATE TYPE "FinancialRecurringRuleRecurrence" AS ENUM ('MONTHLY', 'ANNUAL');

CREATE TABLE "financial_recurring_rules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "direction" "FinancialMovementDirection" NOT NULL,
    "category" TEXT NOT NULL,
    "subcategory" TEXT,
    "recurrence" "FinancialRecurringRuleRecurrence" NOT NULL DEFAULT 'MONTHLY',
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "financial_recurring_rules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "financial_recurring_rule_month_overrides" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "yearMonth" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "financial_recurring_rule_month_overrides_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "financial_recurring_rules_direction_idx" ON "financial_recurring_rules"("direction");

CREATE INDEX "financial_recurring_rules_category_idx" ON "financial_recurring_rules"("category");

CREATE INDEX "financial_recurring_rules_recurrence_idx" ON "financial_recurring_rules"("recurrence");

CREATE INDEX "financial_recurring_rules_isActive_idx" ON "financial_recurring_rules"("isActive");

CREATE UNIQUE INDEX "financial_recurring_rule_month_overrides_ruleId_yearMonth_key" ON "financial_recurring_rule_month_overrides"("ruleId", "yearMonth");

CREATE INDEX "financial_recurring_rule_month_overrides_yearMonth_idx" ON "financial_recurring_rule_month_overrides"("yearMonth");

ALTER TABLE
    "financial_recurring_rule_month_overrides"
ADD
    CONSTRAINT "financial_recurring_rule_month_overrides_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "financial_recurring_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;