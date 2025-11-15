/*
  Warnings:

  - The primary key for the `Account` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `role` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `module_activities` table. All the data in the column will be lost.
  - You are about to drop the `Activity` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Module` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PasswordResetToken` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `VerificationToken` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[provider,providerAccountId]` on the table `Account` will be added. If there are existing duplicate values, this will fail.
  - The required column `id` was added to the `Account` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- CreateEnum
CREATE TYPE "public"."AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT');

-- CreateEnum
CREATE TYPE "public"."BlogStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "public"."TeamBadge" AS ENUM ('SALES', 'CUSTOMER_SERVICE', 'ACADEMIC_COORDINATION', 'TECHNICAL_SUPPORT', 'ADMINISTRATION', 'TEACHER', 'STUDENT');

-- CreateEnum
CREATE TYPE "public"."ActivityStepType" AS ENUM ('INSTRUCTION', 'QUESTION', 'AUDIO', 'RECORDING', 'COMPLETION');

-- CreateEnum
CREATE TYPE "public"."BookingStatus" AS ENUM ('CANCELLED', 'COMPLETED', 'CONFIRMED', 'NO_SHOW', 'PENDING');

-- CreateEnum
CREATE TYPE "public"."EnrollmentStatus" AS ENUM ('PENDING', 'ACTIVE', 'COMPLETED', 'PAUSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."ContentType" AS ENUM ('GRAMMAR_CARD', 'LEVELED_TEXT', 'THEMATIC_GLOSSARY', 'DOWNLOADABLE_RESOURCE', 'ACTIVITY', 'VIDEO', 'PODCAST', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."ResourceType" AS ENUM ('GRAMMAR_GUIDE', 'VOCABULARY_LIST', 'EXERCISE_SHEET', 'INFOGRAPHIC', 'CONJUGATION_TABLE', 'TEMPLATE', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."CouponType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT');

-- CreateEnum
CREATE TYPE "public"."ProductPricingType" AS ENUM ('SINGLE_PRICE', 'MULTIPLE_PLANS');

-- CreateEnum
CREATE TYPE "public"."ProductPaymentType" AS ENUM ('ONE_TIME', 'RECURRING');

-- CreateEnum
CREATE TYPE "public"."PurchaseStatus" AS ENUM ('PENDING', 'CONFIRMED', 'SCHEDULED', 'ENROLLED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."SubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'EXPIRED', 'PAUSED');

-- CreateEnum
CREATE TYPE "public"."InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."RewardType" AS ENUM ('EARNED_ACTIVITY', 'EARNED_STREAK', 'EARNED_LEVEL', 'SPENT_LIVES', 'SPENT_PREMIUM', 'SPENT_MERCHANDISE', 'SPENT_COUPON');

-- CreateEnum
CREATE TYPE "public"."CreditTransactionType" AS ENUM ('PURCHASE', 'SPEND_PRODUCT', 'SPEND_PLAN', 'SPEND_COURSE', 'REFUND', 'BONUS', 'ADMIN_ADJUSTMENT', 'REWARD', 'EXPIRED');

-- CreateEnum
CREATE TYPE "public"."CallStatus" AS ENUM ('SCHEDULED', 'ACTIVE', 'ENDED', 'CANCELLED', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."MessageType" AS ENUM ('TEXT', 'FILE', 'SYSTEM', 'EMOJI');

-- CreateEnum
CREATE TYPE "public"."QuestionType" AS ENUM ('MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER', 'ESSAY', 'FILL_BLANK', 'MATCHING', 'ORDERING', 'DRAG_DROP');

-- CreateEnum
CREATE TYPE "public"."QuestionDifficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateEnum
CREATE TYPE "public"."AttemptStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED', 'COMPLETED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."AssignmentStatus" AS ENUM ('ASSIGNED', 'STARTED', 'SUBMITTED', 'COMPLETED', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."AudioPosition" AS ENUM ('BEFORE_QUESTION', 'AFTER_QUESTION', 'BEFORE_OPTIONS', 'SECTION_TOP');

-- CreateEnum
CREATE TYPE "public"."FileCategory" AS ENUM ('GENERAL', 'COURSE_CONTENT', 'LESSON_MATERIAL', 'ASSIGNMENT', 'USER_AVATAR', 'BRANDING', 'DOCUMENTATION', 'MEDIA', 'TEMPLATE', 'BACKUP');

-- CreateEnum
CREATE TYPE "public"."FileResourceType" AS ENUM ('IMAGE', 'VIDEO', 'AUDIO', 'RAW');

-- CreateEnum
CREATE TYPE "public"."UsageAction" AS ENUM ('VIEW', 'DOWNLOAD', 'EMBED', 'TRANSFORM', 'SHARE', 'DELETE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."ActivityType" ADD VALUE 'GRAMMAR';
ALTER TYPE "public"."ActivityType" ADD VALUE 'PRONUNCIATION';
ALTER TYPE "public"."ActivityType" ADD VALUE 'COMPREHENSION';
ALTER TYPE "public"."ActivityType" ADD VALUE 'MULTIPLE_CHOICE';
ALTER TYPE "public"."ActivityType" ADD VALUE 'FILL_IN_BLANK';
ALTER TYPE "public"."ActivityType" ADD VALUE 'MATCHING';
ALTER TYPE "public"."ActivityType" ADD VALUE 'ORDERING';
ALTER TYPE "public"."ActivityType" ADD VALUE 'DICTATION';
ALTER TYPE "public"."ActivityType" ADD VALUE 'TRANSLATION';
ALTER TYPE "public"."ActivityType" ADD VALUE 'OTHER';

-- AlterEnum
ALTER TYPE "public"."UserRole" ADD VALUE 'EDITOR';

-- DropForeignKey
ALTER TABLE "public"."module_activities" DROP CONSTRAINT "module_activities_activityId_fkey";

-- DropForeignKey
ALTER TABLE "public"."module_activities" DROP CONSTRAINT "module_activities_moduleId_fkey";

-- DropForeignKey
ALTER TABLE "public"."user_activities" DROP CONSTRAINT "user_activities_activityId_fkey";

-- AlterTable
ALTER TABLE "public"."Account" DROP CONSTRAINT "Account_pkey",
ADD COLUMN     "id" TEXT NOT NULL,
ADD CONSTRAINT "Account_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "public"."User" DROP COLUMN "role",
ADD COLUMN     "bio" TEXT,
ADD COLUMN     "permissions" TEXT[],
ADD COLUMN     "roles" "public"."UserRole"[] DEFAULT ARRAY['GUEST']::"public"."UserRole"[],
ADD COLUMN     "teacherRankId" TEXT,
ADD COLUMN     "teamBadge" "public"."TeamBadge";

-- AlterTable
ALTER TABLE "public"."module_activities" DROP COLUMN "createdAt";

-- AlterTable
ALTER TABLE "public"."user_activities" ADD COLUMN     "answers" JSONB,
ALTER COLUMN "score" SET DATA TYPE DOUBLE PRECISION;

-- DropTable
DROP TABLE "public"."Activity";

-- DropTable
DROP TABLE "public"."Module";

-- DropTable
DROP TABLE "public"."PasswordResetToken";

-- DropTable
DROP TABLE "public"."VerificationToken";

-- CreateTable
CREATE TABLE "public"."user_lives" (
    "userId" TEXT NOT NULL,
    "currentLives" INTEGER NOT NULL DEFAULT 5,
    "maxLives" INTEGER NOT NULL DEFAULT 5,
    "lastRechargeTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rechargeRate" INTEGER NOT NULL DEFAULT 30,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_lives_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "public"."user_rewards" (
    "userId" TEXT NOT NULL,
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "spentPoints" INTEGER NOT NULL DEFAULT 0,
    "currentLevel" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_rewards_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "public"."reward_transactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "public"."RewardType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reward_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_credit_balances" (
    "userId" TEXT NOT NULL,
    "totalCredits" INTEGER NOT NULL DEFAULT 0,
    "availableCredits" INTEGER NOT NULL DEFAULT 0,
    "spentCredits" INTEGER NOT NULL DEFAULT 0,
    "bonusCredits" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_credit_balances_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "public"."credit_packages" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "credits" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "bonusCredits" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPopular" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credit_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."credit_package_purchases" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "creditsReceived" INTEGER NOT NULL,
    "status" "public"."PurchaseStatus" NOT NULL DEFAULT 'CONFIRMED',
    "purchaseDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credit_package_purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."credit_transactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "transactionType" "public"."CreditTransactionType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "balanceBefore" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "relatedEntityId" TEXT,
    "relatedEntityType" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."courses" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "classDuration" INTEGER NOT NULL DEFAULT 40,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."modules" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "level" INTEGER NOT NULL DEFAULT 1,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "courseId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."lessons" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "moduleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."contents" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "contentType" "public"."ContentType" NOT NULL,
    "lessonId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."activities" (
    "id" TEXT NOT NULL,
    "contentId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "activityType" "public"."ActivityType" NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "points" INTEGER NOT NULL DEFAULT 10,
    "duration" INTEGER NOT NULL DEFAULT 5,
    "activityData" JSONB NOT NULL,
    "steps" JSONB NOT NULL,
    "questions" JSONB,
    "timeLimit" INTEGER,
    "createdById" TEXT NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."grammar_cards" (
    "id" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "grammarPoints" JSONB NOT NULL,
    "explanations" JSONB NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grammar_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."leveled_texts" (
    "id" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "textContent" TEXT NOT NULL,
    "translation" TEXT,
    "audioUrl" TEXT,
    "vocabulary" JSONB,
    "exercises" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leveled_texts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."thematic_glossaries" (
    "id" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "theme" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "terms" JSONB NOT NULL,
    "categories" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "thematic_glossaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."downloadable_resources" (
    "id" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "resourceType" "public"."ResourceType" NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "fileFormat" TEXT NOT NULL,
    "previewUrl" TEXT,
    "pages" INTEGER,
    "downloads" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "downloadable_resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_contents" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "percentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastAccessed" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_contents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."resource_views" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resource_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_resources" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."enrollments" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "academicPeriodId" TEXT NOT NULL,
    "status" "public"."EnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "enrollmentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAccessed" TIMESTAMP(3),
    "classesTotal" INTEGER NOT NULL DEFAULT 8,
    "classesAttended" INTEGER NOT NULL DEFAULT 0,
    "classesMissed" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."lesson_activities" (
    "lessonId" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "lesson_activities_pkey" PRIMARY KEY ("lessonId","activityId")
);

-- CreateTable
CREATE TABLE "public"."teacher_courses" (
    "teacherId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teacher_courses_pkey" PRIMARY KEY ("teacherId","courseId")
);

-- CreateTable
CREATE TABLE "public"."class_bookings" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "timeSlot" TEXT NOT NULL,
    "status" "public"."BookingStatus" NOT NULL DEFAULT 'CONFIRMED',
    "notes" TEXT,
    "reminderSent" BOOLEAN NOT NULL DEFAULT false,
    "feedbackId" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancelledBy" TEXT,
    "completedAt" TIMESTAMP(3),
    "creditId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "class_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."seasons" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."academic_periods" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "seasonId" TEXT NOT NULL,
    "isSpecialWeek" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "academic_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."class_schedules" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "class_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."class_credits" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "originPeriodId" TEXT NOT NULL,
    "targetPeriodId" TEXT,
    "creditAmount" INTEGER NOT NULL DEFAULT 1,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "class_credits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."student_credits" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL DEFAULT 1,
    "source" TEXT NOT NULL,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "usedFor" TEXT,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_credits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."teacher_incentives" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "percentage" DOUBLE PRECISION NOT NULL,
    "baseAmount" DOUBLE PRECISION NOT NULL,
    "bonusAmount" DOUBLE PRECISION NOT NULL,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teacher_incentives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."teacher_ranks" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "rateMultiplier" DOUBLE PRECISION NOT NULL,
    "requirementHours" INTEGER NOT NULL,
    "requirementRating" DOUBLE PRECISION NOT NULL,
    "requirementTime" INTEGER NOT NULL,

    CONSTRAINT "teacher_ranks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."teacher_availability" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teacher_availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."class_attendances" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "status" "public"."AttendanceStatus" NOT NULL DEFAULT 'PRESENT',
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "class_attendances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."teacher_attendances" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PRESENT',
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teacher_attendances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."calendar_settings" (
    "id" TEXT NOT NULL,
    "isGlobal" BOOLEAN NOT NULL DEFAULT true,
    "slotDuration" INTEGER NOT NULL DEFAULT 60,
    "startHour" DOUBLE PRECISION NOT NULL DEFAULT 8,
    "endHour" DOUBLE PRECISION NOT NULL DEFAULT 16.5,
    "maxBookingsPerStudent" INTEGER NOT NULL DEFAULT 3,
    "bookingAdvanceNotice" INTEGER NOT NULL DEFAULT 24,
    "cancellationWindow" INTEGER NOT NULL DEFAULT 12,
    "rescheduleMinutes" INTEGER NOT NULL DEFAULT 60,
    "maxReschedulesPerPeriod" INTEGER NOT NULL DEFAULT 2,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."password_reset_tokens" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."verification_tokens" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "image" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."features" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "features_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."products" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "shortDesc" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "comparePrice" DOUBLE PRECISION,
    "sku" TEXT,
    "image" TEXT,
    "images" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDigital" BOOLEAN NOT NULL DEFAULT true,
    "stock" INTEGER,
    "categoryId" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "requiresScheduling" BOOLEAN NOT NULL DEFAULT false,
    "courseId" TEXT,
    "maxScheduleSlots" INTEGER DEFAULT 1,
    "scheduleDuration" INTEGER DEFAULT 60,
    "pricingType" "public"."ProductPricingType" NOT NULL DEFAULT 'SINGLE_PRICE',
    "paymentType" "public"."ProductPaymentType" NOT NULL DEFAULT 'ONE_TIME',
    "creditPrice" INTEGER,
    "acceptsCredits" BOOLEAN NOT NULL DEFAULT false,
    "acceptsRealMoney" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "comparePrice" DOUBLE PRECISION,
    "duration" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPopular" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "productId" TEXT,
    "includesClasses" BOOLEAN NOT NULL DEFAULT false,
    "classesPerPeriod" INTEGER,
    "classesPerWeek" INTEGER,
    "allowProration" BOOLEAN NOT NULL DEFAULT true,
    "autoRenewal" BOOLEAN NOT NULL DEFAULT true,
    "billingCycle" TEXT,
    "courseId" TEXT,
    "creditPrice" INTEGER,
    "acceptsCredits" BOOLEAN NOT NULL DEFAULT false,
    "acceptsRealMoney" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."plan_features" (
    "planId" TEXT NOT NULL,
    "featureId" TEXT NOT NULL,
    "included" BOOLEAN NOT NULL DEFAULT true,
    "value" TEXT,

    CONSTRAINT "plan_features_pkey" PRIMARY KEY ("planId","featureId")
);

-- CreateTable
CREATE TABLE "public"."coupons" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "type" "public"."CouponType" NOT NULL DEFAULT 'PERCENTAGE',
    "value" DOUBLE PRECISION NOT NULL,
    "minAmount" DOUBLE PRECISION,
    "maxDiscount" DOUBLE PRECISION,
    "usageLimit" INTEGER,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "userLimit" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."invoices" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tax" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL,
    "status" "public"."InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "couponId" TEXT,
    "notes" TEXT,
    "dueDate" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "paymentMethod" TEXT,
    "paypalOrderId" TEXT,
    "paypalCaptureId" TEXT,
    "paypalPayerEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."invoice_items" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "productId" TEXT,
    "planId" TEXT,
    "name" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "total" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."blog_posts" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "excerpt" TEXT,
    "content" JSONB NOT NULL,
    "coverImage" TEXT,
    "category" TEXT,
    "tags" TEXT[],
    "status" "public"."BlogStatus" NOT NULL DEFAULT 'DRAFT',
    "authorId" TEXT NOT NULL,
    "readTime" INTEGER,
    "views" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3),
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."product_schedule_slots" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "isBooked" BOOLEAN NOT NULL DEFAULT false,
    "bookedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_schedule_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."product_purchases" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "scheduleSlotId" TEXT,
    "enrollmentId" TEXT,
    "status" "public"."PurchaseStatus" NOT NULL DEFAULT 'PENDING',
    "purchaseDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scheduledDate" TIMESTAMP(3),
    "selectedSchedule" JSONB,
    "proratedClasses" INTEGER,
    "proratedPrice" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "public"."SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "nextBillingDate" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "proratedPrice" DOUBLE PRECISION,
    "proratedClasses" INTEGER,
    "remainingClasses" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."exams" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "instructions" TEXT,
    "timeLimit" INTEGER,
    "passingScore" DOUBLE PRECISION NOT NULL DEFAULT 70,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "isBlocking" BOOLEAN NOT NULL DEFAULT false,
    "isOptional" BOOLEAN NOT NULL DEFAULT false,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "shuffleQuestions" BOOLEAN NOT NULL DEFAULT false,
    "shuffleOptions" BOOLEAN NOT NULL DEFAULT false,
    "showResults" BOOLEAN NOT NULL DEFAULT true,
    "allowReview" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "courseId" TEXT,
    "moduleId" TEXT,
    "lessonId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."exam_sections" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "instructions" TEXT,
    "timeLimit" INTEGER,
    "order" INTEGER NOT NULL DEFAULT 0,
    "points" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exam_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."exam_questions" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "type" "public"."QuestionType" NOT NULL,
    "question" TEXT NOT NULL,
    "options" JSONB,
    "correctAnswer" JSONB NOT NULL,
    "explanation" TEXT,
    "points" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "order" INTEGER NOT NULL DEFAULT 0,
    "difficulty" "public"."QuestionDifficulty" NOT NULL DEFAULT 'MEDIUM',
    "tags" TEXT[],
    "caseSensitive" BOOLEAN NOT NULL DEFAULT false,
    "partialCredit" BOOLEAN NOT NULL DEFAULT false,
    "minLength" INTEGER,
    "maxLength" INTEGER,
    "audioUrl" TEXT,
    "audioPosition" "public"."AudioPosition" NOT NULL DEFAULT 'BEFORE_QUESTION',
    "maxAudioPlays" INTEGER,
    "audioAutoplay" BOOLEAN NOT NULL DEFAULT false,
    "audioPausable" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exam_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."exam_attempts" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "status" "public"."AttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "score" DOUBLE PRECISION,
    "totalPoints" DOUBLE PRECISION,
    "maxPoints" DOUBLE PRECISION,
    "timeSpent" INTEGER,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "questionsOrder" JSONB,
    "optionsOrder" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exam_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."exam_answers" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "answer" JSONB NOT NULL,
    "isCorrect" BOOLEAN,
    "pointsEarned" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "timeSpent" INTEGER,
    "needsReview" BOOLEAN NOT NULL DEFAULT false,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exam_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."exam_assignments" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assignedBy" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3),
    "instructions" TEXT,
    "status" "public"."AssignmentStatus" NOT NULL DEFAULT 'ASSIGNED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exam_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."video_calls" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "bookingId" TEXT,
    "status" "public"."CallStatus" NOT NULL DEFAULT 'SCHEDULED',
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "duration" INTEGER,
    "recordingUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "video_calls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."meeting_messages" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meeting_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."floating_conversations" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "isGroup" BOOLEAN NOT NULL DEFAULT false,
    "lastMessage" TEXT,
    "lastMessageAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "floating_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."conversation_participants" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastReadAt" TIMESTAMP(3),

    CONSTRAINT "conversation_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."floating_chat_messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" "public"."MessageType" NOT NULL DEFAULT 'TEXT',
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isRead" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "floating_chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."file_assets" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "description" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "category" "public"."FileCategory" NOT NULL DEFAULT 'GENERAL',
    "resourceType" "public"."FileResourceType" NOT NULL,
    "format" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "duration" INTEGER,
    "secureUrl" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "folder" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "lastAccessedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "file_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."file_transformations" (
    "id" TEXT NOT NULL,
    "fileAssetId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "transformation" JSONB NOT NULL,
    "generatedUrl" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "format" TEXT,
    "quality" INTEGER,
    "size" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "file_transformations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."file_usage_logs" (
    "id" TEXT NOT NULL,
    "fileAssetId" TEXT NOT NULL,
    "userId" TEXT,
    "action" "public"."UsageAction" NOT NULL,
    "context" TEXT,
    "contextId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "file_usage_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."file_folders" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "parentId" TEXT,
    "description" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "file_folders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reward_transactions_userId_idx" ON "public"."reward_transactions"("userId");

-- CreateIndex
CREATE INDEX "credit_package_purchases_userId_idx" ON "public"."credit_package_purchases"("userId");

-- CreateIndex
CREATE INDEX "credit_package_purchases_packageId_idx" ON "public"."credit_package_purchases"("packageId");

-- CreateIndex
CREATE INDEX "credit_package_purchases_invoiceId_idx" ON "public"."credit_package_purchases"("invoiceId");

-- CreateIndex
CREATE INDEX "credit_transactions_userId_idx" ON "public"."credit_transactions"("userId");

-- CreateIndex
CREATE INDEX "credit_transactions_transactionType_idx" ON "public"."credit_transactions"("transactionType");

-- CreateIndex
CREATE INDEX "credit_transactions_createdAt_idx" ON "public"."credit_transactions"("createdAt");

-- CreateIndex
CREATE INDEX "courses_createdById_idx" ON "public"."courses"("createdById");

-- CreateIndex
CREATE INDEX "modules_courseId_idx" ON "public"."modules"("courseId");

-- CreateIndex
CREATE INDEX "lessons_moduleId_idx" ON "public"."lessons"("moduleId");

-- CreateIndex
CREATE INDEX "contents_lessonId_idx" ON "public"."contents"("lessonId");

-- CreateIndex
CREATE UNIQUE INDEX "activities_contentId_key" ON "public"."activities"("contentId");

-- CreateIndex
CREATE INDEX "activities_contentId_idx" ON "public"."activities"("contentId");

-- CreateIndex
CREATE UNIQUE INDEX "grammar_cards_contentId_key" ON "public"."grammar_cards"("contentId");

-- CreateIndex
CREATE UNIQUE INDEX "leveled_texts_contentId_key" ON "public"."leveled_texts"("contentId");

-- CreateIndex
CREATE UNIQUE INDEX "thematic_glossaries_contentId_key" ON "public"."thematic_glossaries"("contentId");

-- CreateIndex
CREATE UNIQUE INDEX "downloadable_resources_contentId_key" ON "public"."downloadable_resources"("contentId");

-- CreateIndex
CREATE INDEX "user_contents_userId_idx" ON "public"."user_contents"("userId");

-- CreateIndex
CREATE INDEX "user_contents_contentId_idx" ON "public"."user_contents"("contentId");

-- CreateIndex
CREATE UNIQUE INDEX "user_contents_userId_contentId_key" ON "public"."user_contents"("userId", "contentId");

-- CreateIndex
CREATE INDEX "resource_views_userId_idx" ON "public"."resource_views"("userId");

-- CreateIndex
CREATE INDEX "resource_views_contentId_idx" ON "public"."resource_views"("contentId");

-- CreateIndex
CREATE INDEX "user_resources_userId_idx" ON "public"."user_resources"("userId");

-- CreateIndex
CREATE INDEX "user_resources_resourceId_idx" ON "public"."user_resources"("resourceId");

-- CreateIndex
CREATE UNIQUE INDEX "user_resources_userId_resourceId_key" ON "public"."user_resources"("userId", "resourceId");

-- CreateIndex
CREATE INDEX "enrollments_studentId_idx" ON "public"."enrollments"("studentId");

-- CreateIndex
CREATE INDEX "enrollments_courseId_idx" ON "public"."enrollments"("courseId");

-- CreateIndex
CREATE INDEX "enrollments_academicPeriodId_idx" ON "public"."enrollments"("academicPeriodId");

-- CreateIndex
CREATE UNIQUE INDEX "enrollments_studentId_courseId_academicPeriodId_key" ON "public"."enrollments"("studentId", "courseId", "academicPeriodId");

-- CreateIndex
CREATE INDEX "lesson_activities_lessonId_idx" ON "public"."lesson_activities"("lessonId");

-- CreateIndex
CREATE INDEX "lesson_activities_activityId_idx" ON "public"."lesson_activities"("activityId");

-- CreateIndex
CREATE INDEX "teacher_courses_teacherId_idx" ON "public"."teacher_courses"("teacherId");

-- CreateIndex
CREATE INDEX "teacher_courses_courseId_idx" ON "public"."teacher_courses"("courseId");

-- CreateIndex
CREATE INDEX "class_bookings_studentId_idx" ON "public"."class_bookings"("studentId");

-- CreateIndex
CREATE INDEX "class_bookings_teacherId_idx" ON "public"."class_bookings"("teacherId");

-- CreateIndex
CREATE INDEX "class_bookings_enrollmentId_idx" ON "public"."class_bookings"("enrollmentId");

-- CreateIndex
CREATE UNIQUE INDEX "class_bookings_teacherId_day_timeSlot_key" ON "public"."class_bookings"("teacherId", "day", "timeSlot");

-- CreateIndex
CREATE INDEX "seasons_year_idx" ON "public"."seasons"("year");

-- CreateIndex
CREATE UNIQUE INDEX "seasons_name_year_key" ON "public"."seasons"("name", "year");

-- CreateIndex
CREATE INDEX "academic_periods_seasonId_idx" ON "public"."academic_periods"("seasonId");

-- CreateIndex
CREATE INDEX "academic_periods_startDate_endDate_idx" ON "public"."academic_periods"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "class_schedules_teacherId_dayOfWeek_idx" ON "public"."class_schedules"("teacherId", "dayOfWeek");

-- CreateIndex
CREATE UNIQUE INDEX "class_schedules_enrollmentId_dayOfWeek_startTime_key" ON "public"."class_schedules"("enrollmentId", "dayOfWeek", "startTime");

-- CreateIndex
CREATE INDEX "class_credits_studentId_idx" ON "public"."class_credits"("studentId");

-- CreateIndex
CREATE INDEX "class_credits_originPeriodId_idx" ON "public"."class_credits"("originPeriodId");

-- CreateIndex
CREATE INDEX "class_credits_targetPeriodId_idx" ON "public"."class_credits"("targetPeriodId");

-- CreateIndex
CREATE INDEX "student_credits_studentId_idx" ON "public"."student_credits"("studentId");

-- CreateIndex
CREATE INDEX "teacher_incentives_teacherId_periodId_idx" ON "public"."teacher_incentives"("teacherId", "periodId");

-- CreateIndex
CREATE INDEX "teacher_availability_userId_day_idx" ON "public"."teacher_availability"("userId", "day");

-- CreateIndex
CREATE UNIQUE INDEX "teacher_availability_userId_day_startTime_endTime_key" ON "public"."teacher_availability"("userId", "day", "startTime", "endTime");

-- CreateIndex
CREATE INDEX "class_attendances_classId_idx" ON "public"."class_attendances"("classId");

-- CreateIndex
CREATE INDEX "class_attendances_studentId_idx" ON "public"."class_attendances"("studentId");

-- CreateIndex
CREATE INDEX "class_attendances_enrollmentId_idx" ON "public"."class_attendances"("enrollmentId");

-- CreateIndex
CREATE UNIQUE INDEX "class_attendances_classId_studentId_key" ON "public"."class_attendances"("classId", "studentId");

-- CreateIndex
CREATE INDEX "teacher_attendances_classId_idx" ON "public"."teacher_attendances"("classId");

-- CreateIndex
CREATE INDEX "teacher_attendances_teacherId_idx" ON "public"."teacher_attendances"("teacherId");

-- CreateIndex
CREATE UNIQUE INDEX "teacher_attendances_classId_teacherId_key" ON "public"."teacher_attendances"("classId", "teacherId");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_key" ON "public"."password_reset_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_email_token_key" ON "public"."password_reset_tokens"("email", "token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "public"."verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_email_token_key" ON "public"."verification_tokens"("email", "token");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "public"."categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "products_slug_key" ON "public"."products"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_key" ON "public"."products"("sku");

-- CreateIndex
CREATE INDEX "products_categoryId_idx" ON "public"."products"("categoryId");

-- CreateIndex
CREATE INDEX "products_courseId_idx" ON "public"."products"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "plans_slug_key" ON "public"."plans"("slug");

-- CreateIndex
CREATE INDEX "plans_productId_idx" ON "public"."plans"("productId");

-- CreateIndex
CREATE INDEX "plans_courseId_idx" ON "public"."plans"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "coupons_code_key" ON "public"."coupons"("code");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoiceNumber_key" ON "public"."invoices"("invoiceNumber");

-- CreateIndex
CREATE INDEX "invoices_userId_idx" ON "public"."invoices"("userId");

-- CreateIndex
CREATE INDEX "invoices_couponId_idx" ON "public"."invoices"("couponId");

-- CreateIndex
CREATE INDEX "invoices_paypalOrderId_idx" ON "public"."invoices"("paypalOrderId");

-- CreateIndex
CREATE INDEX "invoice_items_invoiceId_idx" ON "public"."invoice_items"("invoiceId");

-- CreateIndex
CREATE INDEX "invoice_items_productId_idx" ON "public"."invoice_items"("productId");

-- CreateIndex
CREATE INDEX "invoice_items_planId_idx" ON "public"."invoice_items"("planId");

-- CreateIndex
CREATE UNIQUE INDEX "blog_posts_slug_key" ON "public"."blog_posts"("slug");

-- CreateIndex
CREATE INDEX "blog_posts_authorId_idx" ON "public"."blog_posts"("authorId");

-- CreateIndex
CREATE INDEX "blog_posts_status_idx" ON "public"."blog_posts"("status");

-- CreateIndex
CREATE INDEX "blog_posts_publishedAt_idx" ON "public"."blog_posts"("publishedAt");

-- CreateIndex
CREATE INDEX "blog_posts_slug_idx" ON "public"."blog_posts"("slug");

-- CreateIndex
CREATE INDEX "product_schedule_slots_productId_idx" ON "public"."product_schedule_slots"("productId");

-- CreateIndex
CREATE INDEX "product_schedule_slots_bookedBy_idx" ON "public"."product_schedule_slots"("bookedBy");

-- CreateIndex
CREATE UNIQUE INDEX "product_schedule_slots_productId_date_key" ON "public"."product_schedule_slots"("productId", "date");

-- CreateIndex
CREATE INDEX "product_purchases_userId_idx" ON "public"."product_purchases"("userId");

-- CreateIndex
CREATE INDEX "product_purchases_productId_idx" ON "public"."product_purchases"("productId");

-- CreateIndex
CREATE INDEX "product_purchases_invoiceId_idx" ON "public"."product_purchases"("invoiceId");

-- CreateIndex
CREATE INDEX "subscriptions_userId_idx" ON "public"."subscriptions"("userId");

-- CreateIndex
CREATE INDEX "subscriptions_planId_idx" ON "public"."subscriptions"("planId");

-- CreateIndex
CREATE INDEX "subscriptions_status_idx" ON "public"."subscriptions"("status");

-- CreateIndex
CREATE INDEX "exams_courseId_idx" ON "public"."exams"("courseId");

-- CreateIndex
CREATE INDEX "exams_moduleId_idx" ON "public"."exams"("moduleId");

-- CreateIndex
CREATE INDEX "exams_lessonId_idx" ON "public"."exams"("lessonId");

-- CreateIndex
CREATE INDEX "exams_createdById_idx" ON "public"."exams"("createdById");

-- CreateIndex
CREATE INDEX "exam_sections_examId_idx" ON "public"."exam_sections"("examId");

-- CreateIndex
CREATE INDEX "exam_questions_sectionId_idx" ON "public"."exam_questions"("sectionId");

-- CreateIndex
CREATE INDEX "exam_attempts_examId_idx" ON "public"."exam_attempts"("examId");

-- CreateIndex
CREATE INDEX "exam_attempts_userId_idx" ON "public"."exam_attempts"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "exam_attempts_examId_userId_attemptNumber_key" ON "public"."exam_attempts"("examId", "userId", "attemptNumber");

-- CreateIndex
CREATE INDEX "exam_answers_attemptId_idx" ON "public"."exam_answers"("attemptId");

-- CreateIndex
CREATE INDEX "exam_answers_questionId_idx" ON "public"."exam_answers"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "exam_answers_attemptId_questionId_key" ON "public"."exam_answers"("attemptId", "questionId");

-- CreateIndex
CREATE INDEX "exam_assignments_examId_idx" ON "public"."exam_assignments"("examId");

-- CreateIndex
CREATE INDEX "exam_assignments_userId_idx" ON "public"."exam_assignments"("userId");

-- CreateIndex
CREATE INDEX "exam_assignments_assignedBy_idx" ON "public"."exam_assignments"("assignedBy");

-- CreateIndex
CREATE UNIQUE INDEX "exam_assignments_examId_userId_key" ON "public"."exam_assignments"("examId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "video_calls_roomId_key" ON "public"."video_calls"("roomId");

-- CreateIndex
CREATE UNIQUE INDEX "video_calls_bookingId_key" ON "public"."video_calls"("bookingId");

-- CreateIndex
CREATE INDEX "video_calls_teacherId_idx" ON "public"."video_calls"("teacherId");

-- CreateIndex
CREATE INDEX "video_calls_studentId_idx" ON "public"."video_calls"("studentId");

-- CreateIndex
CREATE INDEX "video_calls_bookingId_idx" ON "public"."video_calls"("bookingId");

-- CreateIndex
CREATE INDEX "video_calls_status_idx" ON "public"."video_calls"("status");

-- CreateIndex
CREATE INDEX "meeting_messages_bookingId_idx" ON "public"."meeting_messages"("bookingId");

-- CreateIndex
CREATE INDEX "meeting_messages_senderId_idx" ON "public"."meeting_messages"("senderId");

-- CreateIndex
CREATE INDEX "meeting_messages_createdAt_idx" ON "public"."meeting_messages"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "conversation_participants_conversationId_userId_key" ON "public"."conversation_participants"("conversationId", "userId");

-- CreateIndex
CREATE INDEX "floating_chat_messages_conversationId_idx" ON "public"."floating_chat_messages"("conversationId");

-- CreateIndex
CREATE INDEX "floating_chat_messages_senderId_idx" ON "public"."floating_chat_messages"("senderId");

-- CreateIndex
CREATE INDEX "floating_chat_messages_timestamp_idx" ON "public"."floating_chat_messages"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "file_assets_publicId_key" ON "public"."file_assets"("publicId");

-- CreateIndex
CREATE INDEX "file_assets_publicId_idx" ON "public"."file_assets"("publicId");

-- CreateIndex
CREATE INDEX "file_assets_uploadedBy_idx" ON "public"."file_assets"("uploadedBy");

-- CreateIndex
CREATE INDEX "file_assets_resourceType_idx" ON "public"."file_assets"("resourceType");

-- CreateIndex
CREATE INDEX "file_assets_category_idx" ON "public"."file_assets"("category");

-- CreateIndex
CREATE INDEX "file_assets_folder_idx" ON "public"."file_assets"("folder");

-- CreateIndex
CREATE INDEX "file_assets_isActive_idx" ON "public"."file_assets"("isActive");

-- CreateIndex
CREATE INDEX "file_assets_createdAt_idx" ON "public"."file_assets"("createdAt");

-- CreateIndex
CREATE INDEX "file_transformations_fileAssetId_idx" ON "public"."file_transformations"("fileAssetId");

-- CreateIndex
CREATE INDEX "file_usage_logs_fileAssetId_idx" ON "public"."file_usage_logs"("fileAssetId");

-- CreateIndex
CREATE INDEX "file_usage_logs_userId_idx" ON "public"."file_usage_logs"("userId");

-- CreateIndex
CREATE INDEX "file_usage_logs_action_idx" ON "public"."file_usage_logs"("action");

-- CreateIndex
CREATE INDEX "file_usage_logs_createdAt_idx" ON "public"."file_usage_logs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "file_folders_path_key" ON "public"."file_folders"("path");

-- CreateIndex
CREATE INDEX "file_folders_parentId_idx" ON "public"."file_folders"("parentId");

-- CreateIndex
CREATE INDEX "file_folders_createdBy_idx" ON "public"."file_folders"("createdBy");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "public"."Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "public"."Account"("provider", "providerAccountId");

-- CreateIndex
CREATE INDEX "User_roles_idx" ON "public"."User"("roles");

-- CreateIndex
CREATE INDEX "User_teacherRankId_idx" ON "public"."User"("teacherRankId");

-- CreateIndex
CREATE INDEX "module_activities_moduleId_idx" ON "public"."module_activities"("moduleId");

-- CreateIndex
CREATE INDEX "module_activities_activityId_idx" ON "public"."module_activities"("activityId");

-- CreateIndex
CREATE INDEX "user_activities_userId_idx" ON "public"."user_activities"("userId");

-- CreateIndex
CREATE INDEX "user_activities_activityId_idx" ON "public"."user_activities"("activityId");

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_teacherRankId_fkey" FOREIGN KEY ("teacherRankId") REFERENCES "public"."teacher_ranks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_streaks" ADD CONSTRAINT "user_streaks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_lives" ADD CONSTRAINT "user_lives_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_rewards" ADD CONSTRAINT "user_rewards_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reward_transactions" ADD CONSTRAINT "reward_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_credit_balances" ADD CONSTRAINT "user_credit_balances_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."credit_package_purchases" ADD CONSTRAINT "credit_package_purchases_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."credit_package_purchases" ADD CONSTRAINT "credit_package_purchases_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "public"."credit_packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."credit_package_purchases" ADD CONSTRAINT "credit_package_purchases_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "public"."invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."credit_transactions" ADD CONSTRAINT "credit_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."courses" ADD CONSTRAINT "courses_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."modules" ADD CONSTRAINT "modules_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "public"."courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."lessons" ADD CONSTRAINT "lessons_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "public"."modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."contents" ADD CONSTRAINT "contents_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "public"."lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."activities" ADD CONSTRAINT "activities_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "public"."contents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."grammar_cards" ADD CONSTRAINT "grammar_cards_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "public"."contents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."leveled_texts" ADD CONSTRAINT "leveled_texts_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "public"."contents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."thematic_glossaries" ADD CONSTRAINT "thematic_glossaries_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "public"."contents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."downloadable_resources" ADD CONSTRAINT "downloadable_resources_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "public"."contents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_contents" ADD CONSTRAINT "user_contents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_contents" ADD CONSTRAINT "user_contents_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "public"."contents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_activities" ADD CONSTRAINT "user_activities_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "public"."activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."resource_views" ADD CONSTRAINT "resource_views_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_resources" ADD CONSTRAINT "user_resources_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_resources" ADD CONSTRAINT "user_resources_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "public"."downloadable_resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."enrollments" ADD CONSTRAINT "enrollments_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."enrollments" ADD CONSTRAINT "enrollments_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "public"."courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."enrollments" ADD CONSTRAINT "enrollments_academicPeriodId_fkey" FOREIGN KEY ("academicPeriodId") REFERENCES "public"."academic_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."module_activities" ADD CONSTRAINT "module_activities_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "public"."modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."module_activities" ADD CONSTRAINT "module_activities_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "public"."activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."lesson_activities" ADD CONSTRAINT "lesson_activities_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "public"."lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."lesson_activities" ADD CONSTRAINT "lesson_activities_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "public"."activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."teacher_courses" ADD CONSTRAINT "teacher_courses_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."teacher_courses" ADD CONSTRAINT "teacher_courses_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "public"."courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."class_bookings" ADD CONSTRAINT "class_bookings_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."class_bookings" ADD CONSTRAINT "class_bookings_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."class_bookings" ADD CONSTRAINT "class_bookings_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "public"."enrollments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."class_bookings" ADD CONSTRAINT "class_bookings_creditId_fkey" FOREIGN KEY ("creditId") REFERENCES "public"."student_credits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."academic_periods" ADD CONSTRAINT "academic_periods_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "public"."seasons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."class_schedules" ADD CONSTRAINT "class_schedules_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "public"."enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."class_schedules" ADD CONSTRAINT "class_schedules_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."class_credits" ADD CONSTRAINT "class_credits_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."class_credits" ADD CONSTRAINT "class_credits_originPeriodId_fkey" FOREIGN KEY ("originPeriodId") REFERENCES "public"."academic_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."student_credits" ADD CONSTRAINT "student_credits_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."teacher_incentives" ADD CONSTRAINT "teacher_incentives_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."teacher_incentives" ADD CONSTRAINT "teacher_incentives_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "public"."academic_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."teacher_availability" ADD CONSTRAINT "teacher_availability_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."class_attendances" ADD CONSTRAINT "class_attendances_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."class_attendances" ADD CONSTRAINT "class_attendances_classId_fkey" FOREIGN KEY ("classId") REFERENCES "public"."class_bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."class_attendances" ADD CONSTRAINT "class_attendances_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "public"."enrollments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."teacher_attendances" ADD CONSTRAINT "teacher_attendances_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."teacher_attendances" ADD CONSTRAINT "teacher_attendances_classId_fkey" FOREIGN KEY ("classId") REFERENCES "public"."class_bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."products" ADD CONSTRAINT "products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."products" ADD CONSTRAINT "products_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "public"."courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."plans" ADD CONSTRAINT "plans_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."plans" ADD CONSTRAINT "plans_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "public"."courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."plan_features" ADD CONSTRAINT "plan_features_planId_fkey" FOREIGN KEY ("planId") REFERENCES "public"."plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."plan_features" ADD CONSTRAINT "plan_features_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "public"."features"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."invoices" ADD CONSTRAINT "invoices_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."invoices" ADD CONSTRAINT "invoices_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "public"."coupons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."invoice_items" ADD CONSTRAINT "invoice_items_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "public"."invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."invoice_items" ADD CONSTRAINT "invoice_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."invoice_items" ADD CONSTRAINT "invoice_items_planId_fkey" FOREIGN KEY ("planId") REFERENCES "public"."plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."blog_posts" ADD CONSTRAINT "blog_posts_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."product_schedule_slots" ADD CONSTRAINT "product_schedule_slots_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."product_schedule_slots" ADD CONSTRAINT "product_schedule_slots_bookedBy_fkey" FOREIGN KEY ("bookedBy") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."product_purchases" ADD CONSTRAINT "product_purchases_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."product_purchases" ADD CONSTRAINT "product_purchases_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."product_purchases" ADD CONSTRAINT "product_purchases_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "public"."invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."product_purchases" ADD CONSTRAINT "product_purchases_scheduleSlotId_fkey" FOREIGN KEY ("scheduleSlotId") REFERENCES "public"."product_schedule_slots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."product_purchases" ADD CONSTRAINT "product_purchases_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "public"."enrollments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."subscriptions" ADD CONSTRAINT "subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."subscriptions" ADD CONSTRAINT "subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "public"."plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."exams" ADD CONSTRAINT "exams_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."exams" ADD CONSTRAINT "exams_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "public"."courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."exams" ADD CONSTRAINT "exams_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "public"."modules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."exams" ADD CONSTRAINT "exams_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "public"."lessons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."exam_sections" ADD CONSTRAINT "exam_sections_examId_fkey" FOREIGN KEY ("examId") REFERENCES "public"."exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."exam_questions" ADD CONSTRAINT "exam_questions_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "public"."exam_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."exam_attempts" ADD CONSTRAINT "exam_attempts_examId_fkey" FOREIGN KEY ("examId") REFERENCES "public"."exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."exam_attempts" ADD CONSTRAINT "exam_attempts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."exam_answers" ADD CONSTRAINT "exam_answers_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "public"."exam_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."exam_answers" ADD CONSTRAINT "exam_answers_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "public"."exam_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."exam_answers" ADD CONSTRAINT "exam_answers_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."exam_assignments" ADD CONSTRAINT "exam_assignments_examId_fkey" FOREIGN KEY ("examId") REFERENCES "public"."exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."exam_assignments" ADD CONSTRAINT "exam_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."exam_assignments" ADD CONSTRAINT "exam_assignments_assignedBy_fkey" FOREIGN KEY ("assignedBy") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."video_calls" ADD CONSTRAINT "video_calls_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."video_calls" ADD CONSTRAINT "video_calls_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."video_calls" ADD CONSTRAINT "video_calls_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "public"."class_bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."meeting_messages" ADD CONSTRAINT "meeting_messages_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "public"."class_bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."meeting_messages" ADD CONSTRAINT "meeting_messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."conversation_participants" ADD CONSTRAINT "conversation_participants_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "public"."floating_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."conversation_participants" ADD CONSTRAINT "conversation_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."floating_chat_messages" ADD CONSTRAINT "floating_chat_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "public"."floating_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."floating_chat_messages" ADD CONSTRAINT "floating_chat_messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."file_assets" ADD CONSTRAINT "file_assets_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."file_transformations" ADD CONSTRAINT "file_transformations_fileAssetId_fkey" FOREIGN KEY ("fileAssetId") REFERENCES "public"."file_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."file_usage_logs" ADD CONSTRAINT "file_usage_logs_fileAssetId_fkey" FOREIGN KEY ("fileAssetId") REFERENCES "public"."file_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."file_usage_logs" ADD CONSTRAINT "file_usage_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."file_folders" ADD CONSTRAINT "file_folders_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."file_folders" ADD CONSTRAINT "file_folders_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."file_folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
