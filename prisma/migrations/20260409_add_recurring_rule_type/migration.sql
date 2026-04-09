-- CreateEnum
CREATE TYPE "FinancialRecurringRuleType" AS ENUM ('FIXED_AMOUNT', 'INCOME_PERCENTAGE', 'PROFIT_PERCENTAGE');

-- AlterTable
ALTER TABLE "financial_recurring_rules" ADD COLUMN "ruleType" "FinancialRecurringRuleType" NOT NULL DEFAULT 'FIXED_AMOUNT';

-- CreateIndex
CREATE INDEX "financial_recurring_rules_ruleType_idx" ON "financial_recurring_rules"("ruleType");
