'use server'

import { db } from '@/lib/db'
import { auth } from '@/auth'

/**
 * Obtiene los exámenes disponibles para el estudiante actual
 * - Para programas personalizados: solo exámenes asignados explícitamente
 * - Para programas no personalizados: todos los exámenes publicados del curso
 */
export async function getStudentAssignedExams() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'No autorizado', exams: [] }
    }

    const studentId = session.user.id

    // Obtener inscripciones activas del estudiante
    const enrollments = await db.enrollment.findMany({
      where: {
        studentId,
        status: 'ACTIVE',
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            language: true,
            level: true,
            isPersonalized: true,
          },
        },
      },
    })

    // Separar cursos personalizados y no personalizados
    const personalizedCourseIds = enrollments
      .filter((e) => e.course.isPersonalized)
      .map((e) => e.courseId)
    const nonPersonalizedCourseIds = enrollments
      .filter((e) => !e.course.isPersonalized)
      .map((e) => e.courseId)

    // 1. Obtener exámenes asignados explícitamente (para programas personalizados)
    const assignments = await db.examAssignment.findMany({
      where: {
        userId: studentId,
        exam: {
          isPublished: true,
          courseId: { in: personalizedCourseIds },
        },
      },
      include: {
        exam: {
          include: {
            course: {
              select: {
                id: true,
                title: true,
                language: true,
                level: true,
              },
            },
            creator: {
              select: {
                id: true,
                name: true,
                lastName: true,
              },
            },
            sections: {
              include: {
                questions: true,
              },
            },
            _count: {
              select: {
                attempts: {
                  where: {
                    userId: studentId,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // 2. Obtener exámenes de cursos no personalizados (disponibles automáticamente)
    const nonPersonalizedExams = await db.exam.findMany({
      where: {
        courseId: { in: nonPersonalizedCourseIds },
        isPublished: true,
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            language: true,
            level: true,
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
            lastName: true,
          },
        },
        sections: {
          include: {
            questions: true,
          },
        },
        _count: {
          select: {
            attempts: {
              where: {
                userId: studentId,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Obtener todos los IDs de exámenes (asignados + no personalizados)
    const assignedExamIds = assignments.map((a) => a.examId)
    const nonPersonalizedExamIds = nonPersonalizedExams.map((e) => e.id)
    const allExamIds = [...assignedExamIds, ...nonPersonalizedExamIds]

    // Obtener intentos del estudiante para todos los exámenes
    const attempts = await db.examAttempt.findMany({
      where: {
        userId: studentId,
        examId: { in: allExamIds },
      },
      orderBy: { startedAt: 'desc' },
    })

    const attemptsByExam = attempts.reduce(
      (acc, attempt) => {
        if (!acc[attempt.examId]) {
          acc[attempt.examId] = []
        }
        acc[attempt.examId].push(attempt)
        return acc
      },
      {} as Record<string, typeof attempts>
    )

    // Procesar exámenes asignados (programas personalizados)
    const assignedExams = assignments.map((assignment) => {
      const examAttempts = attemptsByExam[assignment.examId] || []
      const completedAttempts = examAttempts.filter((a) => a.status === 'COMPLETED')
      const inProgressAttempt = examAttempts.find((a) => a.status === 'IN_PROGRESS')
      const bestScore = completedAttempts.length > 0
        ? Math.max(...completedAttempts.map((a) => a.score || 0))
        : null
      const passed = bestScore !== null && bestScore >= assignment.exam.passingScore

      return {
        id: assignment.exam.id,
        title: assignment.exam.title,
        description: assignment.exam.description,
        instructions: assignment.exam.instructions,
        timeLimit: assignment.exam.timeLimit,
        passingScore: assignment.exam.passingScore,
        maxAttempts: assignment.exam.maxAttempts,
        questionCount: assignment.exam.sections.reduce(
          (acc, s) => acc + s.questions.length,
          0
        ),
        totalPoints: assignment.exam.sections.reduce(
          (acc, s) => acc + s.questions.reduce((qAcc, q) => qAcc + q.points, 0),
          0
        ),
        course: assignment.exam.course,
        teacher: assignment.exam.creator,
        assignment: {
          id: assignment.id,
          status: assignment.status,
          dueDate: assignment.dueDate,
          instructions: assignment.instructions,
          assignedAt: assignment.createdAt,
        },
        attempts: {
          total: examAttempts.length,
          completed: completedAttempts.length,
          remaining: assignment.exam.maxAttempts - examAttempts.length,
          inProgressId: inProgressAttempt?.id || null,
          bestScore,
          passed,
        },
      }
    })

    // Procesar exámenes de programas no personalizados (disponibles automáticamente)
    const autoAvailableExams = nonPersonalizedExams.map((exam) => {
      const examAttempts = attemptsByExam[exam.id] || []
      const completedAttempts = examAttempts.filter((a) => a.status === 'COMPLETED')
      const inProgressAttempt = examAttempts.find((a) => a.status === 'IN_PROGRESS')
      const bestScore = completedAttempts.length > 0
        ? Math.max(...completedAttempts.map((a) => a.score || 0))
        : null
      const passed = bestScore !== null && bestScore >= exam.passingScore

      return {
        id: exam.id,
        title: exam.title,
        description: exam.description,
        instructions: exam.instructions,
        timeLimit: exam.timeLimit,
        passingScore: exam.passingScore,
        maxAttempts: exam.maxAttempts,
        questionCount: exam.sections.reduce(
          (acc, s) => acc + s.questions.length,
          0
        ),
        totalPoints: exam.sections.reduce(
          (acc, s) => acc + s.questions.reduce((qAcc, q) => qAcc + q.points, 0),
          0
        ),
        course: exam.course,
        teacher: exam.creator,
        assignment: {
          id: null,
          status: 'AUTO_AVAILABLE' as const,
          dueDate: null,
          instructions: null,
          assignedAt: null,
        },
        attempts: {
          total: examAttempts.length,
          completed: completedAttempts.length,
          remaining: exam.maxAttempts - examAttempts.length,
          inProgressId: inProgressAttempt?.id || null,
          bestScore,
          passed,
        },
      }
    })

    // Combinar ambos tipos de exámenes
    const exams = [...assignedExams, ...autoAvailableExams]

    return { success: true, exams }
  } catch (error) {
    console.error('Error fetching student assigned exams:', error)
    return { success: false, error: 'Error al obtener los exámenes', exams: [] }
  }
}

/**
 * Obtiene un examen específico para el estudiante
 * Soporta tanto exámenes asignados (programas personalizados) como
 * exámenes disponibles automáticamente (programas no personalizados)
 */
export async function getStudentExamDetails(examId: string) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'No autorizado' }
    }

    const studentId = session.user.id

    // Primero, intentar obtener el examen directamente
    const exam = await db.exam.findUnique({
      where: { id: examId },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            language: true,
            isPersonalized: true,
          },
        },
        creator: {
          select: {
            name: true,
            lastName: true,
          },
        },
        sections: {
          include: {
            questions: true,
          },
          orderBy: { order: 'asc' },
        },
      },
    })

    if (!exam || !exam.course) {
      return { success: false, error: 'Examen no encontrado' }
    }

    if (!exam.isPublished) {
      return { success: false, error: 'El examen aún no está disponible' }
    }

    // Verificar acceso al examen
    let assignment = null
    let hasAccess = false

    if (exam.course.isPersonalized) {
      // Para programas personalizados, verificar asignación explícita
      assignment = await db.examAssignment.findUnique({
        where: {
          examId_userId: {
            examId,
            userId: studentId,
          },
        },
      })
      hasAccess = !!assignment
    } else {
      // Para programas no personalizados, verificar inscripción activa en el curso
      const enrollment = await db.enrollment.findFirst({
        where: {
          studentId,
          courseId: exam.course.id,
          status: 'ACTIVE',
        },
      })
      hasAccess = !!enrollment
    }

    if (!hasAccess) {
      return { success: false, error: 'No tienes acceso a este examen' }
    }

    // Obtener intentos del estudiante
    const attempts = await db.examAttempt.findMany({
      where: {
        examId,
        userId: studentId,
      },
      orderBy: { startedAt: 'desc' },
    })

    const completedAttempts = attempts.filter((a) => a.status === 'COMPLETED')
    const inProgressAttempt = attempts.find((a) => a.status === 'IN_PROGRESS')

    return {
      success: true,
      exam: {
        ...exam,
        questionCount: exam.sections.reduce(
          (acc, s) => acc + s.questions.length,
          0
        ),
      },
      assignment: assignment
        ? {
            id: assignment.id,
            status: assignment.status,
            dueDate: assignment.dueDate,
            instructions: assignment.instructions,
          }
        : {
            id: null,
            status: 'AUTO_AVAILABLE',
            dueDate: null,
            instructions: null,
          },
      attempts: {
        list: attempts,
        total: attempts.length,
        completed: completedAttempts.length,
        remaining: exam.maxAttempts - attempts.length,
        inProgressId: inProgressAttempt?.id || null,
        bestScore: completedAttempts.length > 0
          ? Math.max(...completedAttempts.map((a) => a.score || 0))
          : null,
      },
    }
  } catch (error) {
    console.error('Error fetching student exam details:', error)
    return { success: false, error: 'Error al obtener el examen' }
  }
}
