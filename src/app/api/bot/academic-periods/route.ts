import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/api-auth'

/**
 * GET /api/bot/academic-periods
 * List active and future academic periods for enrollment
 * Auth: API Key with scope 'enrollments:read'
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request, ['enrollments:read'])
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const now = new Date()
    const todayStart = new Date(now)
    todayStart.setUTCHours(0, 0, 0, 0)
    const todayEnd = new Date(now)
    todayEnd.setUTCHours(23, 59, 59, 999)

    const periods = await db.academicPeriod.findMany({
      where: {
        OR: [
          // Current periods (already started but not ended)
          {
            startDate: { lte: todayEnd },
            endDate: { gte: todayStart },
          },
          // Future periods (haven't started yet)
          {
            startDate: { gt: todayEnd },
          },
        ],
        isSpecialWeek: false,
      },
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
        isActive: true,
        season: {
          select: {
            id: true,
            name: true,
            year: true,
          },
        },
        _count: {
          select: {
            enrollments: true,
          },
        },
      },
      orderBy: {
        startDate: 'asc',
      },
    })

    return NextResponse.json({
      success: true,
      data: periods.map((p) => ({
        id: p.id,
        name: p.name,
        startDate: p.startDate.toISOString().split('T')[0],
        endDate: p.endDate.toISOString().split('T')[0],
        isActive: p.isActive,
        season: p.season,
        enrollmentCount: p._count.enrollments,
        isCurrent:
          p.startDate <= todayEnd && p.endDate >= todayStart,
        isFuture: p.startDate > todayEnd,
      })),
    })
  } catch (error) {
    console.error('[BOT API] Error fetching academic periods:', error)
    return NextResponse.json(
      { error: 'Error al obtener períodos académicos' },
      { status: 500 }
    )
  }
}
