-- AlterTable
ALTER TABLE "exams" ADD COLUMN "slug" TEXT;
ALTER TABLE "exams" ADD COLUMN "isPublicAccess" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "exams_slug_key" ON "exams"("slug");
