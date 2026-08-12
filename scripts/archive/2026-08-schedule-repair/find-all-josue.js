const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  const users = await db.user.findMany({
    where: {
      OR: [
        { name: { contains: 'Josu', mode: 'insensitive' } },
        { lastName: { contains: 'Dur', mode: 'insensitive' } },
      ]
    },
    select: { id: true, name: true, lastName: true, email: true, roles: true }
  });
  console.log('Usuarios encontrados:', users.length);
  for (const u of users) {
    console.log(u);
    const bookingsAsTeacher = await db.classBooking.count({ where: { teacherId: u.id } });
    const bookingsAsStudent = await db.classBooking.count({ where: { studentId: u.id } });
    const schedulesAsTeacher = await db.classSchedule.count({ where: { teacherId: u.id } });
    console.log(`  bookings as teacher: ${bookingsAsTeacher}, as student: ${bookingsAsStudent}, classSchedule as teacher: ${schedulesAsTeacher}`);
  }
  await db.$disconnect();
}
main();
