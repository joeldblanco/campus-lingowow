-- AlterTable: Remove unique constraint on bookingId and add segmentNumber
-- This allows multiple recordings per booking (segments)

-- Step 1: Add segmentNumber column with default value
ALTER TABLE "class_recordings" ADD COLUMN IF NOT EXISTS "segmentNumber" INTEGER NOT NULL DEFAULT 1;

-- Step 2: Drop the unique constraint on bookingId if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'class_recordings_bookingId_key'
    ) THEN
        ALTER TABLE "class_recordings" DROP CONSTRAINT "class_recordings_bookingId_key";
    END IF;
END $$;

-- Step 3: Add unique constraint on egressId (to prevent duplicate recordings)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'class_recordings_egressId_key'
    ) THEN
        ALTER TABLE "class_recordings" ADD CONSTRAINT "class_recordings_egressId_key" UNIQUE ("egressId");
    END IF;
END $$;

-- Step 4: Create index on bookingId for efficient queries (if not exists)
CREATE INDEX IF NOT EXISTS "class_recordings_bookingId_idx" ON "class_recordings"("bookingId");
