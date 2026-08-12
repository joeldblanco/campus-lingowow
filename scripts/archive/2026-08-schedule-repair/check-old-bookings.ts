import { db } from './src/lib/db'
import { convertTimeSlotFromUTC } from './src/lib/utils/date'

async function main() {
  const bookings = await db.classBooking.findMany({
    where: {
      id: {
        in: [
          'cmsgzplgj0001w1d0sjmsa262', // 08-03 18:00-19:00
          'cmsgzplyn000bw1d0otooetub', // 08-07 18:00-19:00
          'cmsgzpmaz000jw1d0v9w65hbe', // 08-07 19:00-20:00
        ],
      },
    },
    include: { teacherAttendances: true, attendances: true },
  })
  const now = new Date()
  console.log('Hora actual del servidor (UTC):', now.toISOString())
  for (const b of bookings) {
    const local = convertTimeSlotFromUTC(b.day, b.timeSlot, 'America/Caracas')
    console.log(`\n${b.id}`)
    console.log(`  UTC: ${b.day} ${b.timeSlot} | VET: ${local.day} ${local.timeSlot}`)
    console.log(`  status: ${b.status} | completedAt: ${b.completedAt}`)
    console.log(`  teacherAttendances: ${b.teacherAttendances.length} | studentAttendances: ${b.attendances.length}`)
  }
  await db.$disconnect()
}
main()
