import { db } from './src/lib/db'
import { convertTimeSlotToUTC, convertTimeSlotFromUTC } from './src/lib/utils/date'

const TZ = 'America/Caracas'
const TEACHER_ID = 'cmjyermcv0000jx04jsh3m9he'

// Reasignación: mismos 3 registros, corregidos al patrón real Lun/Jue/Vie 19:00(20:00 Jue)-20:00(21:00 Jue)
const FIXES = [
  { id: 'cmsgzplgj0001w1d0sjmsa262', localDay: '2026-08-03', slot: '19:00-20:00' }, // Lunes (ya era lunes, solo cambia hora)
  { id: 'cmsgzplyn000bw1d0otooetub', localDay: '2026-08-06', slot: '20:00-21:00' }, // pasa a Jueves (faltaba)
  { id: 'cmsgzpmaz000jw1d0v9w65hbe', localDay: '2026-08-07', slot: '19:00-20:00' }, // Viernes (ya era viernes, solo cambia hora)
]

async function main() {
  console.log('=== Verificando conflictos antes de escribir ===')
  const computed = FIXES.map((f) => {
    const utc = convertTimeSlotToUTC(f.localDay, f.slot, TZ)
    return { ...f, utcDay: utc.day, utcSlot: utc.timeSlot }
  })

  for (const c of computed) {
    console.log(`${c.id}: ${c.localDay} ${c.slot} VET -> UTC ${c.utcDay} ${c.utcSlot}`)
    const conflicts = await db.classBooking.findMany({
      where: {
        teacherId: TEACHER_ID,
        day: c.utcDay,
        status: { not: 'CANCELLED' },
        id: { not: c.id },
      },
    })
    const [newStart, newEnd] = c.utcSlot.split('-')
    for (const conf of conflicts) {
      const [cs, ce] = conf.timeSlot.split('-')
      if (newStart < ce && newEnd > cs) {
        throw new Error(`Conflicto: ${c.id} choca con ${conf.id} (${conf.day} ${conf.timeSlot})`)
      }
    }
  }
  console.log('Sin conflictos.\n')

  console.log('=== Aplicando ===')
  await db.$transaction(async (tx) => {
    for (const c of computed) {
      await tx.classBooking.update({
        where: { id: c.id },
        data: { day: c.utcDay, timeSlot: c.utcSlot },
      })
    }
  })

  console.log('=== Verificación final ===')
  const updated = await db.classBooking.findMany({
    where: { id: { in: FIXES.map((f) => f.id) } },
    orderBy: { day: 'asc' },
  })
  for (const b of updated) {
    const local = convertTimeSlotFromUTC(b.day, b.timeSlot, TZ)
    const dow = new Date(local.day + 'T12:00:00Z').toLocaleDateString('es-VE', { weekday: 'long', timeZone: 'UTC' })
    console.log(`  ${local.day} (${dow}) ${local.timeSlot} VET | status=${b.status}`)
  }

  await db.$disconnect()
}
main().catch((e) => {
  console.error('ERROR:', e.message)
  process.exit(1)
})
