import type { Prisma } from '@prisma/client'

import { db } from '@/lib/db'
import {
  getClassAutoCompletionDate,
  shouldAutoCompleteClassBooking,
} from '@/lib/utils/class-booking-completion'

interface SyncableClassBooking {
  id: string
  status: string
  day: string
  timeSlot: string
  completedAt: Date | null
  isPayable: boolean
  teacherAttendances: Array<{ id: string }>
}

function getAutoCompletionUpdateData(booking: SyncableClassBooking) {
  if (!shouldAutoCompleteClassBooking(booking)) {
    return null
  }

  const completedAt = booking.completedAt ?? getClassAutoCompletionDate(booking.day, booking.timeSlot)
  if (!completedAt) {
    return null
  }

  const needsUpdate =
    booking.status !== 'COMPLETED' || booking.completedAt === null || !booking.isPayable

  if (!needsUpdate) {
    return null
  }

  return {
    status: 'COMPLETED' as const,
    completedAt,
    isPayable: true,
  }
}

export async function syncAutoCompletedClassBookings(
  where: Prisma.ClassBookingWhereInput = {}
): Promise<string[]> {
  const todayUtc = new Date().toISOString().split('T')[0]

  const bookings = await db.classBooking.findMany({
    where: {
      AND: [
        where,
        { status: { not: 'CANCELLED' } },
        { teacherAttendances: { some: {} } },
        { day: { lte: todayUtc } },
      ],
    },
    select: {
      id: true,
      status: true,
      day: true,
      timeSlot: true,
      completedAt: true,
      isPayable: true,
      teacherAttendances: {
        select: { id: true },
        take: 1,
      },
    },
  })

  const updates = bookings.flatMap((booking) => {
    const data = getAutoCompletionUpdateData(booking)
    if (!data) {
      return []
    }

    return [{ id: booking.id, data }]
  })

  if (updates.length === 0) {
    return []
  }

  await Promise.all(
    updates.map(({ id, data }) =>
      db.classBooking.update({
        where: { id },
        data,
      })
    )
  )

  return updates.map(({ id }) => id)
}

export async function syncAutoCompletedClassBooking(id: string): Promise<boolean> {
  const updatedIds = await syncAutoCompletedClassBookings({ id })
  return updatedIds.includes(id)
}