'use server'

import { db } from '@/lib/db'
import { auth } from '@/auth'

/**
 * Obtiene los exámenes asignados al estudiante actual
 */
export async function getStudentAssignedExams() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'No autorizado', exams: [] }
    }

    const assignments = await db.examAssignment.findMany({
      where: {
        userId: session.user.id,
        exam: {
          isPublished: true,
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
                    userId: session.user.id,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Obtener intentos del estudiante para cada examen
    const examIds = assignments.map((a) => a.examId)
    const attempts = await db.examAttempt.findMany({
      where: {
        userId: session.user.id,
        examId: { in: examIds },
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

    const exams = assignments.map((assignment) => {
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

    return { success: true, exams }
  } catch (error) {
    console.error('Error fetching student assigned exams:', error)
    return { success: false, error: 'Error al obtener los exámenes', exams: [] }
  }
}

/**
 * Obtiene un examen específico asignado al estudiante
 */
export async function getStudentExamDetails(examId: string) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'No autorizado' }
    }

    // Verificar que el examen esté asignado al estudiante
    const assignment = await db.examAssignment.findUnique({
      where: {
        examId_userId: {
          examId,
          userId: session.user.id,
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
        },
      },
    })

    if (!assignment) {
      return { success: false, error: 'Examen no encontrado o no asignado' }
    }

    if (!assignment.exam.isPublished) {
      return { success: false, error: 'El examen aún no está disponible' }
    }

    // Obtener intentos del estudiante
    const attempts = await db.examAttempt.findMany({
      where: {
        examId,
        userId: session.user.id,
      },
      orderBy: { startedAt: 'desc' },
    })

    const completedAttempts = attempts.filter((a) => a.status === 'COMPLETED')
    const inProgressAttempt = attempts.find((a) => a.status === 'IN_PROGRESS')

    return {
      success: true,
      exam: {
        ...assignment.exam,
        questionCount: assignment.exam.sections.reduce(
          (acc, s) => acc + s.questions.length,
          0
        ),
      },
      assignment: {
        id: assignment.id,
        status: assignment.status,
        dueDate: assignment.dueDate,
        instructions: assignment.instructions,
      },
      attempts: {
        list: attempts,
        total: attempts.length,
        completed: completedAttempts.length,
        remaining: assignment.exam.maxAttempts - attempts.length,
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
