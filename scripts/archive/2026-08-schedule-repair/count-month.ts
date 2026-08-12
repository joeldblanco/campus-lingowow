import { db } from './src/lib/db'

async function main() {
  const studentId = 'cmjz5louv003qw1a8u3mljfp9'

  const bookings = await db.classBooking.findMany({
    where: { studentId, day: { gte: '2026-08-01', lte: '2026-08-31' } },
    orderBy: [{ day: 'asc' }, { timeSlot: 'asc' }],
  })

  console.log(`Total registradas en agosto 2026: ${bookings.length}\n`)
  const byStatus: Record<string, number> = {}
  for (const b of bookings) {
    byStatus[b.status] = (byStatus[b.status] || 0) + 1
    console.log(`  ${b.day} ${b.timeSlot} - ${b.status}`)
  }
  console.log('\nPor estado:', byStatus)

  await db.$disconnect()
}
main()
