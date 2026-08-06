import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/api-auth'
import { formatFirstName, formatFullName } from '@/lib/utils/name-formatter'
import { EnrollmentStatus } from '@prisma/client'

// Endpoint for the CRM bot to fetch students with active enrollments.
// Returns personal data (name, email) of enrolled students, so it requires the
// same scoped auth as the sibling bot routes.

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request, ['enrollments:read'])
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const enrollments = await db.enrollment.findMany({
      where: {
        status: { in: [EnrollmentStatus.ACTIVE, EnrollmentStatus.PENDING] },
      },
      select: {
        id: true,
        status: true,
        classesTotal: true,
        classesAttended: true,
        student: {
          select: {
            id: true,
            name: true,
            lastName: true,
            email: true,
          },
        },
        course: {
          select: {
            id: true,
            title: true,
            language: true,
          },
        },
        teacher: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { enrollmentDate: 'desc' },
      take: 100,
    })

    // Group by student
    const studentMap = new Map<string, {
      id: string
      name: string
      email: string
      enrollments: Array<{
        course: string
        teacher: string | null
        status: string
        classesTotal: number
        classesAttended: number
      }>
    }>()

    for (const e of enrollments) {
      const sid = e.student.id
      if (!studentMap.has(sid)) {
        studentMap.set(sid, {
          id: sid,
          name: formatFullName(e.student.name, e.student.lastName),
          email: e.student.email,
          enrollments: [],
        })
      }
      studentMap.get(sid)!.enrollments.push({
        course: e.course.title,
        teacher: e.teacher?.name ? formatFirstName(e.teacher.name) : null,
        status: e.status,
        classesTotal: e.classesTotal,
        classesAttended: e.classesAttended,
      })
    }

    return NextResponse.json({ students: Array.from(studentMap.values()) })
  } catch (error) {
    console.error('[BOT API] Error fetching students:', error)
    return NextResponse.json(
      { error: 'Error al obtener estudiantes' },
      { status: 500 }
    )
  }
}
