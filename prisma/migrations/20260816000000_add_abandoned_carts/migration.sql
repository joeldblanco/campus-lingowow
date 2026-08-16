-- CreateEnum
CREATE TYPE "AbandonedCartStatus" AS ENUM ('PENDING', 'EMAILED', 'RECOVERED', 'PURCHASED');

-- CreateTable
CREATE TABLE "abandoned_carts" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "userId" TEXT,
    "items" JSONB NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "recoveryToken" TEXT NOT NULL,
    "status" "AbandonedCartStatus" NOT NULL DEFAULT 'PENDING',
    "recoveryEmailSentAt" TIMESTAMP(3),
    "recoveredAt" TIMESTAMP(3),
    "purchasedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "abandoned_carts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "abandoned_carts_email_key" ON "abandoned_carts"("email");

-- CreateIndex
CREATE UNIQUE INDEX "abandoned_carts_recoveryToken_key" ON "abandoned_carts"("recoveryToken");

-- CreateIndex
CREATE INDEX "abandoned_carts_email_idx" ON "abandoned_carts"("email");

-- CreateIndex
CREATE INDEX "abandoned_carts_status_idx" ON "abandoned_carts"("status");

-- CreateIndex
CREATE INDEX "abandoned_carts_recoveryToken_idx" ON "abandoned_carts"("recoveryToken");
