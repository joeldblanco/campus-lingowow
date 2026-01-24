import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { UserRole } from '@prisma/client'

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    console.log('=== DEBUG: Session user ===')
    console.log('User ID:', session.user.id)
    console.log('User email:', session.user.email)
    console.log('User roles:', session.user.roles)

    // Verificar que el usuario sea profesor o admin
    const isTeacher = session.user.roles?.includes(UserRole.TEACHER)
    const isAdmin = session.user.roles?.includes(UserRole.ADMIN)
    
    console.log('Is Teacher:', isTeacher)
    console.log('Is Admin:', isAdmin)
    
    if (!isTeacher && !isAdmin) {
      console.log('User roles:', session.user.roles)
      return NextResponse.json({ 
        error: 'Solo profesores o administradores pueden acceder', 
        roles: session.user.roles 
      }, { status: 403 })
    }

    const userId = session.user.id

    let students

    if (isAdmin) {
      // Admin puede ver todos los estudiantes del sistema
      console.log('=== ADMIN USER - Fetching ALL students ===')
      students = await db.user.findMany({
        where: {
          roles: {
            has: 'STUDENT'
          }
        },
        select: {
          id: true,
          name: true,
          lastName: true,
          email: true,
          image: true,
        },
        orderBy: {
          name: 'asc'
        }
      })
      console.log('All students found:', students.length)
    } else {
      // Teacher ve solo estudiantes de sus inscripciones activas donde es el teacher asignado
      console.log('=== TEACHER USER - Fetching assigned students ===')
      
      // Obtener los cursos que el profesor puede enseñar (TeacherCourse)
      const teacherCourses = await db.teacherCourse.findMany({
        where: { teacherId: userId },
        select: { courseId: true }
      })
      const teachableCourseIds = teacherCourses.map(tc => tc.courseId)
      console.log('Teacher can teach courses:', teachableCourseIds)
      
      // Obtener estudiantes de enrollments donde:
      // 1. El profesor está asignado directamente (teacherId) - enrollments nuevos
      // 2. O el enrollment es de un curso que el profesor puede enseñar Y no tiene teacherId asignado - enrollments legacy
      const studentsFromEnrollments = await db.enrollment.findMany({
        where: {
          status: 'ACTIVE',
          OR: [
            { teacherId: userId },
            {
              teacherId: null,
              courseId: { in: teachableCourseIds }
            }
          ]
        },
        select: {
          id: true,
          studentId: true,
          student: {
            select: {
              id: true,
              name: true,
              lastName: true,
              email: true,
              image: true,
            },
          },
          course: {
            select: {
              id: true,
              title: true
            }
          }
        },
        distinct: ['studentId'],
      })

      console.log('Students from enrollments found:', studentsFromEnrollments.length)
      studentsFromEnrollments.forEach(enrollment => {
        console.log(`- ${enrollment.student.name} (${enrollment.student.email}) - Course: ${enrollment.course.title}`)
      })

      // Formatear estudiantes sin duplicados
      const uniqueStudentsMap = new Map()
      studentsFromEnrollments.forEach((enrollment) => {
        const student = enrollment.student
        if (!uniqueStudentsMap.has(student.id)) {
          uniqueStudentsMap.set(student.id, {
            id: student.id,
            name: `${student.name || ''} ${student.lastName || ''}`.trim(),
            email: student.email,
            image: student.image,
          })
        }
      })

      students = Array.from(uniqueStudentsMap.values()).sort((a, b) =>
        a.name.localeCompare(b.name)
      )
      
      console.log('Final unique students for teacher:', students.length)
    }

    const formattedStudents = students.map(student => ({
      id: student.id,
      name: student.lastName ? `${student.name || ''} ${student.lastName}`.trim() : (student.name || ''),
      email: student.email,
      image: student.image,
    }))

    return NextResponse.json({
      success: true,
      students: formattedStudents,
      debug: {
        userId,
        isTeacher,
        isAdmin,
        totalStudents: formattedStudents.length,
        userRoles: session.user.roles
      }
    })
  } catch (error) {
    console.error('Error obteniendo estudiantes:', error)
    return NextResponse.json({ 
      error: 'Error interno del servidor', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}
