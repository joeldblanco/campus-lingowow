import { NextRequest, NextResponse } from 'next/server'
import { getMobileUser, unauthorizedResponse } from '@/lib/mobile-auth'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const user = await getMobileUser(req)

    if (!user) {
      return unauthorizedResponse()
    }

    // Obtener inscripciones del usuario con detalles del curso
    const enrollments = await db.enrollment.findMany({
      where: {
        studentId: user.id,
        status: { in: ['ACTIVE', 'COMPLETED'] },
      },
      select: {
        id: true,
        status: true,
        progress: true,
        enrollmentDate: true,
        lastAccessed: true,
        classesTotal: true,
        classesAttended: true,
        course: {
          select: {
            id: true,
            title: true,
            description: true,
            language: true,
            level: true,
            image: true,
            classDuration: true,
            isSynchronous: true,
            modules: {
              where: { isPublished: true },
              select: {
                id: true,
                title: true,
                order: true,
                _count: {
                  select: {
                    lessons: {
                      where: { isPublished: true },
                    },
                  },
                },
              },
              orderBy: { order: 'asc' },
            },
            _count: {
              select: {
                modules: { where: { isPublished: true } },
              },
            },
          },
        },
      },
      orderBy: { lastAccessed: 'desc' },
    })

    const courses = enrollments.map((enrollment) => ({
      enrollmentId: enrollment.id,
      status: enrollment.status,
      progress: enrollment.progress,
      enrollmentDate: enrollment.enrollmentDate,
      lastAccessed: enrollment.lastAccessed,
      classesTotal: enrollment.classesTotal,
      classesAttended: enrollment.classesAttended,
      course: {
        id: enrollment.course.id,
        title: enrollment.course.title,
        description: enrollment.course.description,
        language: enrollment.course.language,
        level: enrollment.course.level,
        image: enrollment.course.image,
        classDuration: enrollment.course.classDuration,
        isSynchronous: enrollment.course.isSynchronous,
        modulesCount: enrollment.course._count.modules,
        modules: enrollment.course.modules.map((m) => ({
          id: m.id,
          title: m.title,
          order: m.order,
          lessonsCount: m._count.lessons,
        })),
      },
    }))

    return NextResponse.json({
      success: true,
      courses,
    })
  } catch (error) {
    console.error('Error obteniendo cursos:', error)

    return NextResponse.json(
      { error: 'Error al obtener los cursos' },
      { status: 500 }
    )
  }
}
