CREATE TABLE "external_payments" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "recordedBy" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "external_payments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "external_payments_amount_check" CHECK ("amountMinor" > 0),
    CONSTRAINT "external_payments_currency_check" CHECK ("currency" IN ('USD', 'PEN')),
    CONSTRAINT "external_payments_provider_check" CHECK ("provider" = 'culqi')
);
CREATE UNIQUE INDEX "external_payments_provider_reference_key" ON "external_payments"("provider", "reference");
CREATE UNIQUE INDEX "external_payments_enrollmentId_key" ON "external_payments"("enrollmentId");
ALTER TABLE "external_payments" ADD CONSTRAINT "external_payments_enrollmentId_fkey"
    FOREIGN KEY ("enrollmentId") REFERENCES "enrollments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
