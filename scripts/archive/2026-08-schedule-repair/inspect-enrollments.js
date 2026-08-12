const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  const studentId = 'cmjz5louv003qw1a8u3mljfp9';
  const enrollments = await db.enrollment.findMany({
    where: { studentId },
    include: {
      course: { select: { title: true } },
      schedules: true,
    }
  });

  for (const e of enrollments) {
    console.log(`Enrollment ${e.id} | status: ${e.status} | course: ${e.course.title} | createdAt: ${e.createdAt}`);
    e.schedules.forEach(s => console.log(`   schedule: dayOfWeek=${s.dayOfWeek} ${s.startTime}-${s.endTime} (UTC)`));
  }

  console.log('\n=== Future/non-completed bookings ===');
  const bookings = await db.classBooking.findMany({
    where: { studentId, status: { not: 'CANCELLED' }, completedAt: null },
    orderBy: [{ day: 'asc' }, { timeSlot: 'asc' }]
  });
  bookings.forEach(b => console.log(`${b.id} | ${b.day} ${b.timeSlot} | status=${b.status} | enrollmentId=${b.enrollmentId}`));

  await db.$disconnect();
}
main();
