-- Migration: Remove ExamSection and connect ExamQuestion directly to Exam
-- This migration eliminates the unnecessary ExamSection layer

-- Step 1: Add examId column to exam_questions (nullable initially)
ALTER TABLE "exam_questions" ADD COLUMN "examId" TEXT;

-- Step 2: Populate examId from the section's examId
UPDATE "exam_questions" eq
SET "examId" = es."examId"
FROM "exam_sections" es
WHERE eq."sectionId" = es."id";

-- Step 3: Make examId NOT NULL after populating
ALTER TABLE "exam_questions" ALTER COLUMN "examId" SET NOT NULL;

-- Step 4: Drop the old foreign key constraint on sectionId
ALTER TABLE "exam_questions" DROP CONSTRAINT IF EXISTS "exam_questions_sectionId_fkey";

-- Step 5: Drop the sectionId column
ALTER TABLE "exam_questions" DROP COLUMN "sectionId";

-- Step 6: Add foreign key constraint for examId
ALTER TABLE "exam_questions" ADD CONSTRAINT "exam_questions_examId_fkey" 
FOREIGN KEY ("examId") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 7: Create index on examId
CREATE INDEX "exam_questions_examId_idx" ON "exam_questions"("examId");

-- Step 8: Drop the exam_sections table
DROP TABLE "exam_sections";
