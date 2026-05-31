-- CreateTable
CREATE TABLE "impersonation_tokens" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "originalUserId" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "consumedFromIp" TEXT,
    "consumedFromUa" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "impersonation_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "impersonation_tokens_tokenHash_key" ON "impersonation_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "impersonation_tokens_tokenHash_idx" ON "impersonation_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "impersonation_tokens_originalUserId_idx" ON "impersonation_tokens"("originalUserId");

-- CreateIndex
CREATE INDEX "impersonation_tokens_targetUserId_idx" ON "impersonation_tokens"("targetUserId");

-- CreateIndex
CREATE INDEX "impersonation_tokens_expiresAt_idx" ON "impersonation_tokens"("expiresAt");

-- AddForeignKey
ALTER TABLE "impersonation_tokens" ADD CONSTRAINT "impersonation_tokens_originalUserId_fkey" FOREIGN KEY ("originalUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "impersonation_tokens" ADD CONSTRAINT "impersonation_tokens_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
