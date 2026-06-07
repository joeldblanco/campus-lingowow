-- Clases de prueba: ClassBooking puede existir sin inscripción (enrollmentId null)
-- y se marca con isTrial. ClassAttendance también admite enrollmentId null.

-- ClassBooking
ALTER TABLE "class_bookings" ALTER COLUMN "enrollmentId" DROP NOT NULL;
ALTER TABLE "class_bookings" ADD COLUMN "isTrial" BOOLEAN NOT NULL DEFAULT false;

-- ClassAttendance
ALTER TABLE "class_attendances" ALTER COLUMN "enrollmentId" DROP NOT NULL;
