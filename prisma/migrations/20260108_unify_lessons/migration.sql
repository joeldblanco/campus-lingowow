-- Unify StudentLesson into Lesson model
-- This migration adds personalization fields to Lesson and migrates data from StudentLesson

-- Step 1: Add new columns to lessons table
ALTER TABLE "lessons" ADD COLUMN IF NOT EXISTS "studentId" TEXT;
ALTER TABLE "lessons" ADD COLUMN IF NOT EXISTS "teacherId" TEXT;
ALTER TABLE "lessons" ADD COLUMN IF NOT EXISTS "enrollmentId" TEXT;

-- Make moduleId nullable (for personalized lessons)
ALTER TABLE "lessons" ALTER COLUMN "moduleId" DROP NOT NULL;

-- Make description have a default
ALTER TABLE "lessons" ALTER COLUMN "description" SET DEFAULT '';

-- Step 2: Migrate data from student_lessons to lessons
INSERT INTO "lessons" (
  "id",
  "title",
  "description",
  "order",
  "duration",
  "content",
  "isPublished",
  "videoUrl",
  "summary",
  "transcription",
  "studentId",
  "teacherId",
  "enrollmentId",
  "createdAt",
  "updatedAt"
)
SELECT 
  "id",
  "title",
  "description",
  "order",
  "duration",
  "content",
  "isPublished",
  "videoUrl",
  "summary",
  "transcription",
  "studentId",
  "teacherId",
  "enrollmentId",
  "createdAt",
  "updatedAt"
FROM "student_lessons";

-- Step 3: Migrate student_lesson_contents to contents
INSERT INTO "contents" (
  "id",
  "title",
  "description",
  "order",
  "contentType",
  "lessonId",
  "parentId",
  "data",
  "createdAt",
  "updatedAt"
)
SELECT 
  "id",
  "title",
  "description",
  "order",
  "contentType",
  "studentLessonId" as "lessonId",
  "parentId",
  "data",
  "createdAt",
  "updatedAt"
FROM "student_lesson_contents";

-- Step 4: Create lesson_progress table
CREATE TABLE IF NOT EXISTS "lesson_progress" (
  "id" TEXT NOT NULL,
  "lessonId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "completed" BOOLEAN NOT NULL DEFAULT false,
  "percentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "lastAccessed" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "lesson_progress_pkey" PRIMARY KEY ("id")
);

-- Step 5: Migrate student_lesson_progress to lesson_progress
INSERT INTO "lesson_progress" (
  "id",
  "lessonId",
  "studentId",
  "completed",
  "percentage",
  "lastAccessed",
  "completedAt",
  "createdAt",
  "updatedAt"
)
SELECT 
  "id",
  "studentLessonId" as "lessonId",
  "studentId",
  "completed",
  "percentage",
  "lastAccessed",
  "completedAt",
  "createdAt",
  "updatedAt"
FROM "student_lesson_progress";

-- Step 6: Add indexes
CREATE INDEX IF NOT EXISTS "lessons_studentId_idx" ON "lessons"("studentId");
CREATE INDEX IF NOT EXISTS "lessons_teacherId_idx" ON "lessons"("teacherId");
CREATE INDEX IF NOT EXISTS "lessons_enrollmentId_idx" ON "lessons"("enrollmentId");
CREATE UNIQUE INDEX IF NOT EXISTS "lesson_progress_lessonId_key" ON "lesson_progress"("lessonId");
CREATE INDEX IF NOT EXISTS "lesson_progress_studentId_idx" ON "lesson_progress"("studentId");

-- Step 7: Add foreign key constraints
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 8: Drop old tables (after data migration)
DROP TABLE IF EXISTS "student_lesson_progress";
DROP TABLE IF EXISTS "student_lesson_contents";
DROP TABLE IF EXISTS "student_lessons";
