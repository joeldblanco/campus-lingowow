const { PrismaClient } = require('@prisma/client');

const db = new PrismaClient();

async function findTeacherSchedule() {
  try {
    // Buscar al profesor
    const teacher = await db.user.findFirst({
      where: {
        OR: [
          { name: { contains: 'Josué', mode: 'insensitive' } },
          { lastName: { contains: 'Durán', mode: 'insensitive' } },
          { name: { contains: 'josue', mode: 'insensitive' } },
          { lastName: { contains: 'duran', mode: 'insensitive' } }
        ]
      }
    });

    if (!teacher) {
      console.log('Profesor no encontrado');
      return;
    }

    console.log('=== PROFESOR ===');
    console.log('Nombre:', teacher.name, teacher.lastName);
    console.log('Email:', teacher.email);
    console.log('ID:', teacher.id);
    console.log('Timezone:', teacher.timezone);

    // Disponibilidad (TeacherAvailability)
    console.log('\n=== DISPONIBILIDAD (TeacherAvailability) ===');
    const availability = await db.teacherAvailability.findMany({
      where: { userId: teacher.id },
      orderBy: [{ day: 'asc' }, { startTime: 'asc' }]
    });

    if (availability.length > 0) {
      availability.forEach(slot => {
        console.log(`${slot.day}: ${slot.startTime} - ${slot.endTime}`);
      });
    } else {
      console.log('(Sin registros)');
    }

    // Clases programadas (ClassBooking)
    console.log('\n=== CLASES PROGRAMADAS (ClassBooking) ===');
    const bookings = await db.classBooking.findMany({
      where: { teacherId: teacher.id },
      include: {
        student: { select: { name: true, lastName: true } },
        enrollment: { include: { course: { select: { title: true } } } }
      },
      orderBy: [{ day: 'asc' }, { timeSlot: 'asc' }],
      take: 20
    });

    if (bookings.length > 0) {
      bookings.forEach(booking => {
        const course = booking.enrollment?.course?.title || 'Clase de prueba';
        const student = `${booking.student.name} ${booking.student.lastName || ''}`.trim();
        console.log(`${booking.day} ${booking.timeSlot}: ${student} - ${course} (${booking.status})`);
      });
      console.log(`\n(Total: ${bookings.length} clases)`);
    } else {
      console.log('(Sin clases programadas)');
    }

    // Horario de clase recurrente (ClassSchedule)
    console.log('\n=== HORARIO RECURRENTE (ClassSchedule) ===');
    const schedules = await db.classSchedule.findMany({
      where: { teacherId: teacher.id },
      include: {
        enrollment: { include: { course: { select: { title: true } } } }
      },
      orderBy: { dayOfWeek: 'asc' }
    });

    if (schedules.length > 0) {
      const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      schedules.forEach(schedule => {
        const day = dayNames[schedule.dayOfWeek] || `Día ${schedule.dayOfWeek}`;
        const course = schedule.enrollment?.course?.title || 'Desconocido';
        console.log(`${day}: ${schedule.startTime} - ${schedule.endTime} (${course})`);
      });
    } else {
      console.log('(Sin horarios recurrentes)');
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await db.$disconnect();
  }
}

findTeacherSchedule();
