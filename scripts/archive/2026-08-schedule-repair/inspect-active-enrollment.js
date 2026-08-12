const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  const enrollment = await db.enrollment.findUnique({
    where: { id: 'cmsgpxgdm0000w1csutyx4eu9' },
    include: {
      schedules: { include: { teacher: { select: { id: true, name: true, lastName: true, timezone: true } } } },
      bookings: { where: { status: { not: 'CANCELLED' } }, orderBy: [{ day: 'asc' }, { timeSlot: 'asc' }] },
      course: { select: { title: true, classDuration: true } },
      academicPeriod: { select: { startDate: true, endDate: true } },
    }
  });
  console.log('Course:', enrollment.course.title, 'classDuration:', enrollment.course.classDuration);
  console.log('Academic period:', enrollment.academicPeriod);
  console.log('Teacher:', enrollment.schedules[0]?.teacher);
  console.log('\nBookings:');
  enrollment.bookings.forEach(b => console.log(`${b.id} | ${b.day} ${b.timeSlot} | ${b.status} | completedAt=${b.completedAt}`));

  // check teacher's other bookings around relevant days to detect conflicts later
  await db.$disconnect();
}
main();
