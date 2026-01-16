-- CreateEnum
CREATE TYPE "ExamType" AS ENUM ('COURSE_EXAM', 'PLACEMENT_TEST', 'DIAGNOSTIC', 'PRACTICE');

-- AlterTable: Add placement test fields to Exam
ALTER TABLE "exams" ADD COLUMN "examType" "ExamType" NOT NULL DEFAULT 'COURSE_EXAM';
ALTER TABLE "exams" ADD COLUMN "isGuestAccessible" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "exams" ADD COLUMN "targetLanguage" TEXT;

-- AlterTable: Add placement test result fields to ExamAttempt
ALTER TABLE "exam_attempts" ADD COLUMN "recommendedLevel" TEXT;
ALTER TABLE "exam_attempts" ADD COLUMN "resultEmailSent" BOOLEAN NOT NULL DEFAULT false;
