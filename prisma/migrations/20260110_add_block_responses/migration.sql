-- CreateTable
CREATE TABLE "block_responses" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "blockId" TEXT NOT NULL,
    "blockType" TEXT NOT NULL,
    "response" JSONB NOT NULL,
    "score" DOUBLE PRECISION,
    "maxScore" DOUBLE PRECISION,
    "isCorrect" BOOLEAN,
    "feedback" TEXT,
    "gradedBy" TEXT,
    "gradedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "block_responses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "block_responses_userId_idx" ON "block_responses"("userId");

-- CreateIndex
CREATE INDEX "block_responses_contentId_idx" ON "block_responses"("contentId");

-- CreateIndex
CREATE INDEX "block_responses_blockId_idx" ON "block_responses"("blockId");

-- CreateIndex
CREATE UNIQUE INDEX "block_responses_userId_contentId_blockId_key" ON "block_responses"("userId", "contentId", "blockId");

-- AddForeignKey
ALTER TABLE "block_responses" ADD CONSTRAINT "block_responses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "block_responses" ADD CONSTRAINT "block_responses_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "contents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
