import { NextRequest, NextResponse } from 'next/server'

import { syncAutoCompletedClassBookings } from '@/lib/class-booking-auto-completion'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const completedBookingIds = await syncAutoCompletedClassBookings()

    return NextResponse.json({
      success: true,
      completedCount: completedBookingIds.length,
    })
  } catch (error) {
    console.error('Error completing scheduled classes:', error)
    return NextResponse.json({ error: 'Error completing scheduled classes' }, { status: 500 })
  }
}
