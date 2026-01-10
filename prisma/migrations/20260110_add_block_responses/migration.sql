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

-- CreateTable
CREATE TABLE "ai_grading_usage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "usageType" TEXT NOT NULL,
    "entityId" TEXT,
    "entityType" TEXT,
    "tokensUsed" INTEGER,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_grading_usage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_grading_usage_userId_idx" ON "ai_grading_usage"("userId");

-- CreateIndex
CREATE INDEX "ai_grading_usage_userId_usageType_periodStart_periodEnd_idx" ON "ai_grading_usage"("userId", "usageType", "periodStart", "periodEnd");

-- AddForeignKey
ALTER TABLE "ai_grading_usage" ADD CONSTRAINT "ai_grading_usage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "proctor_events" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'warning',
    "description" TEXT,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "proctor_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "proctor_events_attemptId_idx" ON "proctor_events"("attemptId");

-- CreateIndex
CREATE INDEX "proctor_events_attemptId_eventType_idx" ON "proctor_events"("attemptId", "eventType");

-- AddForeignKey
ALTER TABLE "proctor_events" ADD CONSTRAINT "proctor_events_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "exam_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
