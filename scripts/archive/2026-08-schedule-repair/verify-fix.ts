import { db } from './src/lib/db'
import { convertTimeSlotFromUTC } from './src/lib/utils/date'

async function main() {
  const student = await db.user.findUnique({ where: { id: 'cmjz5louv003qw1a8u3mljfp9' } })
  console.log('Timezone estudiante:', student?.timezone)

  const bookings = await db.classBooking.findMany({
    where: { enrollmentId: 'cmsgpxgdm0000w1csutyx4eu9', status: 'CONFIRMED', day: { gt: '2026-08-07' } },
    orderBy: [{ day: 'asc' }],
  })
  console.log('\nClases futuras confirmadas (hora Venezuela):')
  for (const b of bookings) {
    const local = convertTimeSlotFromUTC(b.day, b.timeSlot, 'America/Caracas')
    const dow = new Date(local.day + 'T12:00:00Z').toLocaleDateString('es-VE', { weekday: 'long', timeZone: 'UTC' })
    console.log(`  ${local.day} (${dow}) ${local.timeSlot}`)
  }

  const cancelled = await db.classBooking.count({
    where: { enrollmentId: 'cmsgpxgdm0000w1csutyx4eu9', status: 'CANCELLED', day: { gt: '2026-08-07' } },
  })
  console.log(`\nBookings viejos cancelados: ${cancelled}`)

  await db.$disconnect()
}
main()
