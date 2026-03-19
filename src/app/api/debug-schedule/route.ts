import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { format, startOfMonth, endOfMonth } from 'date-fns'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No auth', session: null })
    }

    const userId = session.user.id
    const roles = session.user.roles
    const now = new Date()
    const monthStart = startOfMonth(now)
    const monthEnd = endOfMonth(now)
    const startDateStr = format(monthStart, 'yyyy-MM-dd')
    const endDateStr = format(monthEnd, 'yyyy-MM-dd')

    // Get teacher data
    const teacherData = await db.user.findUnique({
      where: { id: userId },
      select: { timezone: true, name: true, roles: true },
    })

    // Get bookings
    const bookings = await db.classBooking.findMany({
      where: {
        teacherId: userId,
        day: { gte: startDateStr, lte: endDateStr },
      },
      select: { id: true, day: true, timeSlot: true, status: true },
    })

    // Get availability
    const availability = await db.teacherAvailability.findMany({
      where: { userId },
      select: { id: true, day: true, startTime: true, endTime: true },
    })

    // Get blocked days
    const blockedDays = await db.teacherBlockedDay.findMany({
      where: {
        teacherId: userId,
        date: { gte: startDateStr, lte: endDateStr },
      },
      select: { date: true },
    })

    return NextResponse.json({
      userId,
      roles,
      teacherName: teacherData?.name,
      teacherTimezone: teacherData?.timezone,
      teacherRoles: teacherData?.roles,
      dateRange: { start: startDateStr, end: endDateStr },
      bookingsCount: bookings.length,
      bookingsSample: bookings.slice(0, 3),
      availabilityCount: availability.length,
      availabilitySample: availability.slice(0, 5),
      blockedDaysCount: blockedDays.length,
    })
  } catch (error) {
    return NextResponse.json({
      error: String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
  }
}
