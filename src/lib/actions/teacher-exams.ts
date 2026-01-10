'use server'

import { db } from '@/lib/db'
import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'
import { AssignmentStatus } from '@prisma/client'

/**
 * Obtiene los exámenes de un curso creados por el profesor actual
 */
export async function getTeacherExamsForCourse(courseId: string) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'No autorizado', exams: [] }
    }

    const exams = await db.exam.findMany({
      where: {
        courseId,
        createdById: session.user.id,
      },
      include: {
        sections: {
          include: {
            questions: true,
          },
        },
        assignments: {
          include: {
            student: {
              select: {
                id: true,
                name: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        attempts: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                lastName: true,
              },
            },
          },
        },
        _count: {
          select: {
            assignments: true,
            attempts: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return {
      success: true,
      exams: exams.map((exam) => ({
        ...exam,
        questionCount: exam.sections.reduce((acc, s) => acc + s.questions.length, 0),
        totalPoints: exam.sections.reduce(
          (acc, s) => acc + s.questions.reduce((qAcc, q) => qAcc + q.points, 0),
          0
        ),
      })),
    }
  } catch (error) {
    console.error('Error fetching teacher exams:', error)
    return { success: false, error: 'Error al obtener los exámenes', exams: [] }
  }
}

/**
 * Crea un nuevo examen borrador para un curso
 */
export async function createTeacherExam(courseId: string, title: string) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'No autorizado' }
    }

    const exam = await db.exam.create({
      data: {
        title,
        description: '',
        instructions: '',
        timeLimit: 60,
        passingScore: 70,
        maxAttempts: 3,
        isBlocking: false,
        isOptional: false,
        shuffleQuestions: false,
        shuffleOptions: false,
        showResults: true,
        allowReview: true,
        isPublished: false,
        createdById: session.user.id,
        courseId,
      },
    })

    // Crear una sección por defecto
    await db.examSection.create({
      data: {
        examId: exam.id,
        title: 'Sección Principal',
        description: '',
        order: 1,
        points: 0,
      },
    })

    revalidatePath(`/teacher/courses/${courseId}`)
    return { success: true, exam }
  } catch (error) {
    console.error('Error creating teacher exam:', error)
    return { success: false, error: 'Error al crear el examen' }
  }
}

/**
 * Obtiene los estudiantes del curso que pueden ser asignados a un examen
 */
export async function getStudentsForExamAssignment(courseId: string) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'No autorizado', students: [] }
    }

    // Obtener estudiantes con inscripciones activas en el curso
    // que hayan tenido clases con este profesor
    const enrollments = await db.enrollment.findMany({
      where: {
        courseId,
        status: 'ACTIVE',
        bookings: {
          some: {
            teacherId: session.user.id,
          },
        },
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            lastName: true,
            email: true,
            image: true,
          },
        },
      },
    })

    const students = enrollments.map((e) => ({
      id: e.student.id,
      name: e.student.name,
      lastName: e.student.lastName,
      email: e.student.email,
      image: e.student.image,
      enrollmentId: e.id,
    }))

    return { success: true, students }
  } catch (error) {
    console.error('Error fetching students for exam assignment:', error)
    return { success: false, error: 'Error al obtener estudiantes', students: [] }
  }
}

/**
 * Asigna un examen a estudiantes específicos
 */
export async function assignExamToStudents(
  examId: string,
  studentIds: string[],
  dueDate?: Date,
  instructions?: string
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'No autorizado' }
    }

    const teacherId = session.user.id

    // Verificar que el examen pertenece al profesor
    const exam = await db.exam.findFirst({
      where: {
        id: examId,
        createdById: teacherId,
      },
    })

    if (!exam) {
      return { success: false, error: 'Examen no encontrado' }
    }

    // Crear asignaciones para cada estudiante
    const assignments = await Promise.all(
      studentIds.map((studentId) =>
        db.examAssignment.upsert({
          where: {
            examId_userId: {
              examId,
              userId: studentId,
            },
          },
          update: {
            dueDate: dueDate || null,
            instructions: instructions || null,
            status: AssignmentStatus.ASSIGNED,
          },
          create: {
            examId,
            userId: studentId,
            assignedBy: teacherId,
            dueDate: dueDate || null,
            instructions: instructions || null,
            status: AssignmentStatus.ASSIGNED,
          },
        })
      )
    )

    revalidatePath(`/teacher/courses/${exam.courseId}`)
    return { success: true, assignments }
  } catch (error) {
    console.error('Error assigning exam to students:', error)
    return { success: false, error: 'Error al asignar el examen' }
  }
}

/**
 * Elimina la asignación de un examen a un estudiante
 */
export async function unassignExamFromStudent(examId: string, studentId: string) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'No autorizado' }
    }

    // Verificar que el examen pertenece al profesor
    const exam = await db.exam.findFirst({
      where: {
        id: examId,
        createdById: session.user.id,
      },
    })

    if (!exam) {
      return { success: false, error: 'Examen no encontrado' }
    }

    // Verificar que no haya intentos del estudiante
    const attempts = await db.examAttempt.count({
      where: {
        examId,
        userId: studentId,
      },
    })

    if (attempts > 0) {
      return {
        success: false,
        error: 'No se puede desasignar porque el estudiante ya tiene intentos',
      }
    }

    await db.examAssignment.delete({
      where: {
        examId_userId: {
          examId,
          userId: studentId,
        },
      },
    })

    revalidatePath(`/teacher/courses/${exam.courseId}`)
    return { success: true }
  } catch (error) {
    console.error('Error unassigning exam from student:', error)
    return { success: false, error: 'Error al desasignar el examen' }
  }
}

/**
 * Publica o despublica un examen
 */
export async function toggleExamPublished(examId: string) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'No autorizado' }
    }

    const exam = await db.exam.findFirst({
      where: {
        id: examId,
        createdById: session.user.id,
      },
      include: {
        sections: {
          include: {
            questions: true,
          },
        },
      },
    })

    if (!exam) {
      return { success: false, error: 'Examen no encontrado' }
    }

    // Verificar que tenga al menos una pregunta antes de publicar
    const questionCount = exam.sections.reduce((acc, s) => acc + s.questions.length, 0)
    if (!exam.isPublished && questionCount === 0) {
      return { success: false, error: 'El examen debe tener al menos una pregunta para publicarse' }
    }

    const updated = await db.exam.update({
      where: { id: examId },
      data: { isPublished: !exam.isPublished },
    })

    revalidatePath(`/teacher/courses/${exam.courseId}`)
    return { success: true, isPublished: updated.isPublished }
  } catch (error) {
    console.error('Error toggling exam published:', error)
    return { success: false, error: 'Error al cambiar estado del examen' }
  }
}

/**
 * Elimina un examen (solo si no tiene intentos)
 */
export async function deleteTeacherExam(examId: string) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'No autorizado' }
    }

    const exam = await db.exam.findFirst({
      where: {
        id: examId,
        createdById: session.user.id,
      },
      include: {
        _count: {
          select: { attempts: true },
        },
      },
    })

    if (!exam) {
      return { success: false, error: 'Examen no encontrado' }
    }

    if (exam._count.attempts > 0) {
      return { success: false, error: 'No se puede eliminar un examen con intentos de estudiantes' }
    }

    await db.exam.delete({
      where: { id: examId },
    })

    revalidatePath(`/teacher/courses/${exam.courseId}`)
    return { success: true }
  } catch (error) {
    console.error('Error deleting teacher exam:', error)
    return { success: false, error: 'Error al eliminar el examen' }
  }
}

/**
 * Obtiene las estadísticas de un examen
 */
export async function getExamStatistics(examId: string) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'No autorizado' }
    }

    const exam = await db.exam.findFirst({
      where: {
        id: examId,
        createdById: session.user.id,
      },
      include: {
        assignments: true,
        attempts: {
          where: {
            status: { in: ['COMPLETED', 'SUBMITTED'] },
          },
        },
      },
    })

    if (!exam) {
      return { success: false, error: 'Examen no encontrado' }
    }

    const completedAttempts = exam.attempts.filter((a) => a.status === 'COMPLETED')
    const scores = completedAttempts.map((a) => a.score || 0)
    const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0
    const passedCount = scores.filter((s) => s >= exam.passingScore).length

    return {
      success: true,
      stats: {
        totalAssigned: exam.assignments.length,
        totalAttempts: exam.attempts.length,
        completedAttempts: completedAttempts.length,
        averageScore: Math.round(averageScore * 100) / 100,
        passRate:
          completedAttempts.length > 0
            ? Math.round((passedCount / completedAttempts.length) * 100)
            : 0,
        highestScore: scores.length > 0 ? Math.max(...scores) : 0,
        lowestScore: scores.length > 0 ? Math.min(...scores) : 0,
      },
    }
  } catch (error) {
    console.error('Error fetching exam statistics:', error)
    return { success: false, error: 'Error al obtener estadísticas' }
  }
}

/**
 * Obtiene los resultados de un examen para el profesor
 */
export async function getExamResultsForTeacher(examId: string) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'No autorizado' }
    }

    const exam = await db.exam.findFirst({
      where: {
        id: examId,
        createdById: session.user.id,
      },
      include: {
        attempts: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                lastName: true,
                email: true,
              },
            },
          },
          orderBy: { startedAt: 'desc' },
        },
      },
    })

    if (!exam) {
      return { success: false, error: 'Examen no encontrado o no tienes permiso' }
    }

    const completedAttempts = exam.attempts.filter((a) => a.status === 'COMPLETED')
    const scores = completedAttempts.map((a) => a.score || 0)
    const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0
    const passedCount = scores.filter((s) => s >= exam.passingScore).length

    return {
      success: true,
      results: {
        id: exam.id,
        title: exam.title,
        description: exam.description,
        passingScore: exam.passingScore,
        courseId: exam.courseId,
        attempts: exam.attempts.map((a) => ({
          id: a.id,
          status: a.status,
          score: a.score,
          startedAt: a.startedAt,
          completedAt: a.submittedAt,
          user: a.user,
        })),
        stats: {
          totalAttempts: exam.attempts.length,
          completedAttempts: completedAttempts.length,
          averageScore,
          passRate: completedAttempts.length > 0
            ? (passedCount / completedAttempts.length) * 100
            : 0,
        },
      },
    }
  } catch (error) {
    console.error('Error fetching exam results for teacher:', error)
    return { success: false, error: 'Error al obtener los resultados' }
  }
}
