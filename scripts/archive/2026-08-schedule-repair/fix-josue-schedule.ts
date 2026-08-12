import { db } from './src/lib/db'
import { convertTimeSlotToUTC, convertRecurringScheduleToUTC } from './src/lib/utils/date'

const STUDENT_ID = 'cmjz5louv003qw1a8u3mljfp9'
const ENROLLMENT_ID = 'cmsgpxgdm0000w1csutyx4eu9'
const TEACHER_ID = 'cmjyermcv0000jx04jsh3m9he'
const TIMEZONE = 'America/Caracas'
const TODAY = '2026-08-07' // no tocar clases de hoy o pasadas
const PERIOD_END = '2026-08-30'

// Nuevo horario deseado (hora Venezuela): Lun 19:00, Jue 20:00, Vie 19:00 (clases de 1h, igual que las actuales)
const NEW_SLOTS = [
  { dayOfWeek: 1, startTime: '19:00', endTime: '20:00' }, // Lunes
  { dayOfWeek: 4, startTime: '20:00', endTime: '21:00' }, // Jueves
  { dayOfWeek: 5, startTime: '19:00', endTime: '20:00' }, // Viernes
]

function nextDatesForDayOfWeek(dayOfWeek: number, fromDateExclusive: string, toDateInclusive: string): string[] {
  const dates: string[] = []
  const start = new Date(fromDateExclusive + 'T12:00:00Z')
  const end = new Date(toDateInclusive + 'T12:00:00Z')
  const cur = new Date(start)
  cur.setUTCDate(cur.getUTCDate() + 1) // empezar el día después de fromDateExclusive
  while (cur <= end) {
    if (cur.getUTCDay() === dayOfWeek) {
      dates.push(cur.toISOString().slice(0, 10))
    }
    cur.setUTCDate(cur.getUTCDate() + 1)
  }
  return dates
}

async function main() {
  console.log('=== 1. Verificando estudiante y enrollment ===')
  const student = await db.user.findUnique({ where: { id: STUDENT_ID } })
  if (!student) throw new Error('Estudiante no encontrado')
  console.log('Estudiante:', student.name, student.lastName, '| timezone actual:', student.timezone)

  const enrollment = await db.enrollment.findUnique({
    where: { id: ENROLLMENT_ID },
    include: { bookings: { where: { status: { not: 'CANCELLED' } } } },
  })
  if (!enrollment) throw new Error('Enrollment no encontrado')

  // Bookings futuros a reemplazar (estrictamente después de hoy)
  const bookingsToReplace = enrollment.bookings.filter((b) => b.day > TODAY)
  console.log(`\nBookings futuros a reemplazar (> ${TODAY}): ${bookingsToReplace.length}`)
  bookingsToReplace.forEach((b) => console.log(`  - ${b.id} | ${b.day} ${b.timeSlot}`))

  // Calcular nuevas fechas de booking
  console.log('\n=== 2. Calculando nuevos bookings ===')
  type NewBooking = { day: string; timeSlot: string }
  const newBookings: NewBooking[] = []
  for (const slot of NEW_SLOTS) {
    const dates = nextDatesForDayOfWeek(slot.dayOfWeek, TODAY, PERIOD_END)
    for (const localDay of dates) {
      const utc = convertTimeSlotToUTC(localDay, `${slot.startTime}-${slot.endTime}`, TIMEZONE)
      newBookings.push({ day: utc.day, timeSlot: utc.timeSlot })
      console.log(`  Local ${localDay} ${slot.startTime}-${slot.endTime} (VET) -> UTC ${utc.day} ${utc.timeSlot}`)
    }
  }

  // Verificar conflictos con otras clases del profesor (excluyendo las que vamos a borrar)
  console.log('\n=== 3. Verificando conflictos con agenda del profesor ===')
  const replaceIds = new Set(bookingsToReplace.map((b) => b.id))
  let hasConflict = false
  for (const nb of newBookings) {
    const conflicts = await db.classBooking.findMany({
      where: {
        teacherId: TEACHER_ID,
        day: nb.day,
        status: { not: 'CANCELLED' },
        id: { notIn: [...replaceIds] },
      },
    })
    const [newStart, newEnd] = nb.timeSlot.split('-')
    for (const c of conflicts) {
      const [cStart, cEnd] = c.timeSlot.split('-')
      if (newStart < cEnd && newEnd > cStart) {
        console.log(`  CONFLICTO: ${nb.day} ${nb.timeSlot} choca con booking ${c.id} (${c.day} ${c.timeSlot})`)
        hasConflict = true
      }
    }
  }
  if (hasConflict) {
    throw new Error('Hay conflictos de horario con el profesor. Abortando sin escribir nada.')
  }
  console.log('  Sin conflictos.')

  // Calcular nuevo ClassSchedule en UTC
  console.log('\n=== 4. Nuevo ClassSchedule (UTC) ===')
  const newScheduleUTC = NEW_SLOTS.map((s) =>
    convertRecurringScheduleToUTC(s.dayOfWeek, s.startTime, s.endTime, TIMEZONE)
  )
  newScheduleUTC.forEach((s) => console.log(`  dayOfWeek=${s.dayOfWeek} ${s.startTime}-${s.endTime} UTC`))

  // Ejecutar todo en una transacción
  console.log('\n=== 5. Aplicando cambios en transacción ===')
  await db.$transaction(async (tx) => {
    // Timezone del estudiante
    await tx.user.update({
      where: { id: STUDENT_ID },
      data: { timezone: TIMEZONE },
    })

    // Reemplazar ClassSchedule del enrollment
    await tx.classSchedule.deleteMany({ where: { enrollmentId: ENROLLMENT_ID } })
    for (const s of newScheduleUTC) {
      await tx.classSchedule.create({
        data: {
          enrollmentId: ENROLLMENT_ID,
          teacherId: TEACHER_ID,
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
        },
      })
    }

    // Cancelar (no borrar, para no perder historial/notificaciones) los bookings futuros viejos
    await tx.classBooking.updateMany({
      where: { id: { in: [...replaceIds] } },
      data: { status: 'CANCELLED' },
    })

    // Crear los nuevos bookings
    for (const nb of newBookings) {
      await tx.classBooking.create({
        data: {
          enrollmentId: ENROLLMENT_ID,
          studentId: STUDENT_ID,
          teacherId: TEACHER_ID,
          day: nb.day,
          timeSlot: nb.timeSlot,
          status: 'CONFIRMED',
        },
      })
    }
  })

  console.log('\n=== LISTO ===')
  console.log(`Timezone actualizado a ${TIMEZONE}`)
  console.log(`${replaceIds.size} bookings viejos cancelados, ${newBookings.length} nuevos creados`)
}

main()
  .catch((e) => {
    console.error('ERROR:', e.message)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
