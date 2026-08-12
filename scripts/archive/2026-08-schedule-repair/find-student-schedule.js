const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  const student = await db.user.findUnique({
    where: { id: 'cmjz5louv003qw1a8u3mljfp9' }
  });
  console.log('Timezone:', student.timezone);

  const bookings = await db.classBooking.findMany({
    where: { studentId: student.id, status: { not: 'CANCELLED' } },
    include: {
      teacher: { select: { name: true, lastName: true } },
      enrollment: { include: { course: { select: { title: true } } } }
    },
    orderBy: [{ day: 'asc' }, { timeSlot: 'asc' }]
  });

  console.log(`\nTotal clases activas: ${bookings.length}\n`);
  bookings.slice(0, 30).forEach(b => {
    const course = b.enrollment?.course?.title || 'Clase de prueba';
    const teacher = b.teacher ? `${b.teacher.name} ${b.teacher.lastName || ''}`.trim() : 'Sin profesor';
    console.log(`${b.day} ${b.timeSlot} - ${course} - Prof: ${teacher} - Estado: ${b.status}`);
  });

  // ClassSchedule as student (via enrollment)
  const enrollments = await db.enrollment.findMany({
    where: { studentId: student.id },
    select: { id: true, course: { select: { title: true } } }
  });
  console.log(`\n=== Enrollments: ${enrollments.length} ===`);
  for (const e of enrollments) {
    const schedules = await db.classSchedule.findMany({
      where: { enrollmentId: e.id },
      include: { teacher: { select: { name: true, lastName: true } } }
    });
    if (schedules.length > 0) {
      const dayNames = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
      console.log(`Curso: ${e.course.title}`);
      schedules.forEach(s => {
        console.log(`  ${dayNames[s.dayOfWeek]}: ${s.startTime}-${s.endTime} - Prof: ${s.teacher.name} ${s.teacher.lastName||''}`);
      });
    }
  }

  await db.$disconnect();
}
main();
