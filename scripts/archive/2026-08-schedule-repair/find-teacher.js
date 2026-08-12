const { PrismaClient } = require('@prisma/client');

const db = new PrismaClient();

async function findTeacher() {
  try {
    // Buscar por nombre o apellido
    const teacher = await db.user.findFirst({
      where: {
        OR: [
          { name: { contains: 'Josué', mode: 'insensitive' } },
          { lastName: { contains: 'Durán', mode: 'insensitive' } },
          { name: { contains: 'josue', mode: 'insensitive' } },
          { lastName: { contains: 'duran', mode: 'insensitive' } }
        ]
      },
      include: {
        teacherAvailability: true
      }
    });

    if (teacher) {
      console.log('=== PROFESOR ENCONTRADO ===');
      console.log('ID:', teacher.id);
      console.log('Nombre:', teacher.name);
      console.log('Apellido:', teacher.lastName);
      console.log('Email:', teacher.email);
      console.log('\n=== DISPONIBILIDAD ===');
      if (teacher.teacherAvailability && teacher.teacherAvailability.length > 0) {
        teacher.teacherAvailability.forEach(slot => {
          console.log(`Día: ${slot.day}, ${slot.startTime} - ${slot.endTime}`);
        });
      } else {
        console.log('No hay disponibilidad registrada');
      }
    } else {
      console.log('Profesor no encontrado');
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await db.$disconnect();
  }
}

findTeacher();
