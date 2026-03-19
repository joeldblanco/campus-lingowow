import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/api-auth'

/**
 * GET /api/bot/teachers
 * List teachers with their courses and availability
 * Query params: courseId (optional) - filter by course
 * Auth: API Key with scope 'enrollments:read'
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request, ['enrollments:read'])
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('courseId')

    const today = new Date().toISOString().split('T')[0]

    const teachers = await db.user.findMany({
      where: {
        roles: { has: 'TEACHER' },
        status: 'ACTIVE',
        ...(courseId && {
          teachableCourses: {
            some: { courseId },
          },
        }),
      },
      include: {
        teachableCourses: {
          include: {
            course: {
              select: {
                id: true,
                title: true,
                language: true,
                level: true,
                classDuration: true,
              },
            },
          },
        },
        teacherAvailability: {
          orderBy: [{ day: 'asc' }, { startTime: 'asc' }],
        },
        teacherBlockedDays: {
          where: {
            date: { gte: today },
          },
          orderBy: { date: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({
      success: true,
      data: teachers.map((t) => ({
        id: t.id,
        name: [t.name, t.lastName].filter(Boolean).join(' '),
        email: t.email,
        timezone: t.timezone,
        courses: t.teachableCourses.map((tc) => ({
          courseId: tc.courseId,
          title: tc.course.title,
          language: tc.course.language,
          level: tc.course.level,
          classDuration: tc.course.classDuration,
        })),
        availability: t.teacherAvailability.map((a) => ({
          day: a.day,
          startTime: a.startTime,
          endTime: a.endTime,
        })),
        blockedDays: t.teacherBlockedDays.map((b) => ({
          date: b.date,
          reason: b.reason,
        })),
      })),
    })
  } catch (error) {
    console.error('[BOT API] Error fetching teachers:', error)
    return NextResponse.json(
      { error: 'Error al obtener profesores' },
      { status: 500 }
    )
  }
}
