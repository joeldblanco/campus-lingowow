import { NextRequest, NextResponse } from 'next/server'
import { getMobileUser, unauthorizedResponse } from '@/lib/mobile-auth'
import { db } from '@/lib/db'
import { addDays } from 'date-fns'

export async function GET(req: NextRequest) {
  try {
    const user = await getMobileUser(req)

    if (!user) {
      return unauthorizedResponse()
    }

    const today = new Date()

    // Obtener datos del dashboard en paralelo
    const [
      enrollments,
      upcomingClasses,
      todayClasses,
      streak,
      lives,
      rewards,
      creditBalance,
      recentActivity,
    ] = await Promise.all([
      // Inscripciones activas
      db.enrollment.findMany({
        where: {
          studentId: user.id,
          status: 'ACTIVE',
        },
        select: {
          id: true,
          progress: true,
          course: {
            select: {
              id: true,
              title: true,
              image: true,
              level: true,
            },
          },
        },
        take: 5,
      }),

      // Próximas clases (7 días)
      db.classBooking.findMany({
        where: {
          studentId: user.id,
          status: 'CONFIRMED',
          day: {
            gte: today.toISOString().split('T')[0],
            lte: addDays(today, 7).toISOString().split('T')[0],
          },
        },
        select: {
          id: true,
          day: true,
          timeSlot: true,
          teacher: {
            select: {
              name: true,
              image: true,
            },
          },
          enrollment: {
            select: {
              course: {
                select: {
                  title: true,
                },
              },
            },
          },
        },
        orderBy: [{ day: 'asc' }, { timeSlot: 'asc' }],
        take: 5,
      }),

      // Clases de hoy
      db.classBooking.count({
        where: {
          studentId: user.id,
          status: 'CONFIRMED',
          day: today.toISOString().split('T')[0],
        },
      }),

      // Racha
      db.userStreak.findUnique({
        where: { userId: user.id },
        select: {
          currentStreak: true,
          longestStreak: true,
        },
      }),

      // Vidas
      db.userLives.findUnique({
        where: { userId: user.id },
        select: {
          currentLives: true,
          maxLives: true,
        },
      }),

      // Recompensas
      db.userRewards.findUnique({
        where: { userId: user.id },
        select: {
          totalPoints: true,
          currentLevel: true,
        },
      }),

      // Balance de créditos
      db.userCreditBalance.findUnique({
        where: { userId: user.id },
        select: {
          availableCredits: true,
        },
      }),

      // Actividad reciente
      db.userActivity.findMany({
        where: { userId: user.id },
        select: {
          activityId: true,
          status: true,
          score: true,
          completedAt: true,
          activity: {
            select: {
              title: true,
              activityType: true,
            },
          },
        },
        orderBy: { completedAt: 'desc' },
        take: 5,
      }),
    ])

    return NextResponse.json({
      success: true,
      dashboard: {
        user: {
          name: user.name,
          image: user.image,
        },
        stats: {
          activeCourses: enrollments.length,
          todayClasses,
          streak: streak?.currentStreak || 0,
          lives: lives?.currentLives || 5,
          maxLives: lives?.maxLives || 5,
          points: rewards?.totalPoints || 0,
          level: rewards?.currentLevel || 1,
          credits: creditBalance?.availableCredits || 0,
        },
        enrollments: enrollments.map((e) => ({
          id: e.id,
          progress: e.progress,
          course: e.course,
        })),
        upcomingClasses: upcomingClasses.map((c) => ({
          id: c.id,
          day: c.day,
          timeSlot: c.timeSlot,
          teacherName: c.teacher.name,
          teacherImage: c.teacher.image,
          courseName: c.enrollment.course.title,
        })),
        recentActivity: recentActivity.map((a) => ({
          title: a.activity.title,
          type: a.activity.activityType,
          status: a.status,
          score: a.score,
          completedAt: a.completedAt,
        })),
      },
    })
  } catch (error) {
    console.error('Error obteniendo dashboard:', error)

    return NextResponse.json(
      { error: 'Error al obtener el dashboard' },
      { status: 500 }
    )
  }
}
