CREATE TYPE "MeetingProvider" AS ENUM ('GOOGLE_MEET', 'LIVEKIT');

ALTER TABLE "class_bookings"
ADD COLUMN "meetingProvider" "MeetingProvider" NOT NULL DEFAULT 'GOOGLE_MEET',
ADD COLUMN "meetingUrl" TEXT,
ADD COLUMN "meetingSpaceName" TEXT,
ADD COLUMN "meetingCode" TEXT,
ADD COLUMN "meetingCreatedAt" TIMESTAMP(3),
ADD COLUMN "meetingLastError" TEXT;

