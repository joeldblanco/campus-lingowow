-- AlterTable
ALTER TABLE "public"."courses" ADD COLUMN     "image" TEXT;

-- AlterTable
ALTER TABLE "public"."lessons" ADD COLUMN     "content" TEXT NOT NULL DEFAULT '[]',
ADD COLUMN     "duration" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "isPublished" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "public"."modules" ADD COLUMN     "objectives" TEXT;
