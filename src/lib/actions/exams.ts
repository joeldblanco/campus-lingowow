'use server'

import { db } from '@/lib/db'
import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'
import { CreateExamSchema, EditExamSchema, AssignExamSchema } from '@/schemas/exams'
import * as z from 'zod'
import { AttemptStatus, AssignmentStatus, Prisma, UserRole } from '@prisma/client'
import type {
  ExamWithDetails,
  ExamStats,
  ExamCreateResponse,
  ExamUpdateResponse,
  ExamDeleteResponse,
  ExamAssignResponse,
} from '@/types/exam'

// =============================================
// FUNCIONES PRINCIPALES DEL SISTEMA DE EXÁMENES
// =============================================

export async function getAllExams(): Promise<ExamWithDetails[]> {
  try {
    const exams = await db.exam.findMany({
      include: {
        creator: {
          select: {
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
            level: true,
            isPersonalized: true,
          },
        },
        module: {
          select: {
            id: true,
            title: true,
            level: true,
          },
        },
        lesson: {
          select: {
            id: true,
            title: true,
          },
        },
        questions: {
          orderBy: { order: 'asc' },
        },
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
        },
        _count: {
          select: {
            attempts: true,
            assignments: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return exams.map((exam) => ({
      ...exam,
      questions: exam.questions.map((question) => ({
        ...question,
        options: question.options as string[] | null,
        correctAnswer: question.correctAnswer as string | string[],
      })),
      attempts: exam.attempts,
    }))
  } catch (error) {
    console.error('Error fetching exams:', error)
    throw new Error('Failed to fetch exams')
  }
}

export async function getExamById(id: string): Promise<ExamWithDetails | null> {
  try {
    const exam = await db.exam.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
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
            level: true,
            isPersonalized: true,
          },
        },
        module: {
          select: {
            id: true,
            title: true,
            level: true,
          },
        },
        lesson: {
          select: {
            id: true,
            title: true,
          },
        },
        questions: {
          orderBy: { order: 'asc' },
        },
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
        },
        _count: {
          select: {
            attempts: true,
            assignments: true,
          },
        },
      },
    })

    if (!exam) return null

    return {
      ...exam,
      questions: exam.questions.map((question) => ({
        ...question,
        options: question.options as string[] | null,
        correctAnswer: question.correctAnswer as string | string[],
      })),
      attempts: exam.attempts,
    }
  } catch (error) {
    console.error('Error fetching exam:', error)
    throw new Error('Failed to fetch exam')
  }
}

export async function createDraftExam(createdById: string): Promise<ExamCreateResponse> {
  try {
    const exam = await db.exam.create({
      data: {
        title: 'Nuevo Examen',
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
        createdById,
      },
    })

    revalidatePath('/admin/exams')
    return { success: true, exam }
  } catch (error) {
    console.error('Error creating draft exam:', error)
    return { success: false, error: 'Error al crear el borrador del examen' }
  }
}

export async function updateExamDraft(
  id: string,
  data: {
    title?: string
    description?: string
    instructions?: string
    timeLimit?: number
    passingScore?: number
    maxAttempts?: number
    isBlocking?: boolean
    isOptional?: boolean
    shuffleQuestions?: boolean
    shuffleOptions?: boolean
    showResults?: boolean
    allowReview?: boolean
    isPublished?: boolean
    courseId?: string | null
    moduleId?: string | null
    lessonId?: string | null
  }
): Promise<ExamUpdateResponse> {
  try {
    const exam = await db.exam.update({
      where: { id },
      data: {
        ...data,
        courseId: data.courseId || null,
        moduleId: data.moduleId || null,
        lessonId: data.lessonId || null,
      },
    })

    return { success: true, exam }
  } catch (error) {
    console.error('Error updating exam draft:', error)
    return { success: false, error: 'Error al actualizar el borrador' }
  }
}

export async function updateExamQuestions(
  examId: string,
  questions: Array<{
    type:
      | 'MULTIPLE_CHOICE'
      | 'TRUE_FALSE'
      | 'SHORT_ANSWER'
      | 'ESSAY'
      | 'RECORDING'
      | 'FILL_BLANK'
      | 'MATCHING'
      | 'ORDERING'
      | 'DRAG_DROP'
    question: string
    options?: string[] | object
    correctAnswer: string | string[] | null
    explanation?: string
    points: number
    order: number
    difficulty?: 'EASY' | 'MEDIUM' | 'HARD'
    tags?: string[]
    caseSensitive?: boolean
    partialCredit?: boolean
    minLength?: number
    maxLength?: number
    audioUrl?: string
    maxAudioPlays?: number
    imageUrl?: string
    // Interactive question data
    content?: string
    pairs?: Array<{ left: string; right: string }>
    items?: Array<{ text: string; correctPosition: number }>
    categories?: Array<{ id: string; name: string }>
    dragItems?: Array<{ text: string; correctCategoryId: string }>
  }>,
  options?: { forceUpdate?: boolean }
): Promise<ExamUpdateResponse> {
  try {
    // PROTECCIÓN: Verificar si hay respuestas de estudiantes antes de eliminar preguntas
    const existingAnswersCount = await db.examAnswer.count({
      where: {
        question: { examId }
      }
    })

    if (existingAnswersCount > 0 && !options?.forceUpdate) {
      return {
        success: false,
        error: `No se pueden modificar las preguntas porque hay ${existingAnswersCount} respuesta(s) de estudiantes. Esto eliminaría permanentemente sus respuestas y calificaciones. Si desea continuar, use la opción de forzar actualización.`,
        hasExistingAnswers: true,
        answersCount: existingAnswersCount
      } as ExamUpdateResponse & { hasExistingAnswers: boolean; answersCount: number }
    }

    const result = await db.$transaction(async (tx) => {
      // Delete existing questions (las respuestas se eliminarán por CASCADE)
      await tx.examQuestion.deleteMany({
        where: { examId },
      })

      // Create new questions
      for (const questionData of questions) {
        const correctAnswer =
          questionData.type === 'ESSAY' || questionData.type === 'RECORDING'
            ? Prisma.JsonNull
            : (questionData.correctAnswer ?? '')

        // Build options object for interactive types
        let optionsData: unknown = questionData.options

        if (questionData.type === 'MATCHING' && questionData.pairs) {
          optionsData = { pairs: questionData.pairs }
        } else if (questionData.type === 'ORDERING' && questionData.items) {
          optionsData = { items: questionData.items }
        } else if (
          questionData.type === 'DRAG_DROP' &&
          (questionData.categories || questionData.dragItems)
        ) {
          optionsData = {
            categories: questionData.categories || [],
            dragItems: questionData.dragItems || [],
          }
        } else if (questionData.type === 'FILL_BLANK' && questionData.content) {
          optionsData = { content: questionData.content }
        }

        // Handle imageUrl - only for IMAGE type, or merge with existing options for other types
        if (questionData.imageUrl) {
          if (
            questionData.type === 'DRAG_DROP' ||
            questionData.type === 'MATCHING' ||
            questionData.type === 'ORDERING' ||
            questionData.type === 'FILL_BLANK'
          ) {
            // Already handled above, add imageUrl to existing object
            optionsData = { ...(optionsData as object), imageUrl: questionData.imageUrl }
          } else if (!optionsData || (Array.isArray(optionsData) && optionsData.length === 0)) {
            // Only set imageUrl as options if no other options exist (e.g., image_question type)
            optionsData = { imageUrl: questionData.imageUrl }
          }
          // For MULTIPLE_CHOICE etc., keep original options array - imageUrl not stored in options
        }

        await tx.examQuestion.create({
          data: {
            examId,
            type: questionData.type,
            question: questionData.question,
            options: optionsData as Prisma.InputJsonValue,
            correctAnswer,
            explanation: questionData.explanation,
            points: questionData.points,
            order: questionData.order,
            difficulty: questionData.difficulty || 'MEDIUM',
            tags: questionData.tags || [],
            caseSensitive: questionData.caseSensitive || false,
            partialCredit: questionData.partialCredit || false,
            minLength: questionData.minLength,
            maxLength: questionData.maxLength,
            audioUrl: questionData.audioUrl,
            maxAudioPlays: questionData.maxAudioPlays,
          },
        })
      }

      return await tx.exam.findUnique({ where: { id: examId } })
    })

    return { success: true, exam: result! }
  } catch (error) {
    console.error('Error updating exam questions:', error)
    return { success: false, error: 'Error al actualizar las preguntas' }
  }
}

export async function createExam(
  data: z.infer<typeof CreateExamSchema>
): Promise<ExamCreateResponse> {
  try {
    // Validar datos de entrada
    const validatedData = CreateExamSchema.parse(data)

    // Los puntos totales se calculan automáticamente en cada sección

    // Crear el examen usando transacción para consistencia
    const result = await db.$transaction(async (tx) => {
      // Crear el examen principal
      const exam = await tx.exam.create({
        data: {
          title: validatedData.title,
          description: validatedData.description,
          instructions: validatedData.instructions,
          timeLimit: validatedData.timeLimit,
          passingScore: validatedData.passingScore,
          maxAttempts: validatedData.maxAttempts,
          isBlocking: validatedData.isBlocking,
          isOptional: validatedData.isOptional,
          isPublished: validatedData.isPublished,
          shuffleQuestions: validatedData.shuffleQuestions,
          shuffleOptions: validatedData.shuffleOptions,
          showResults: validatedData.showResults,
          allowReview: validatedData.allowReview,
          proctoringEnabled: validatedData.proctoringEnabled,
          requireFullscreen: validatedData.requireFullscreen,
          blockCopyPaste: validatedData.blockCopyPaste,
          blockRightClick: validatedData.blockRightClick,
          maxWarnings: validatedData.maxWarnings,
          // Placement test fields
          examType: validatedData.examType,
          targetLanguage: validatedData.targetLanguage,
          slug: validatedData.slug,
          isPublicAccess: validatedData.isPublicAccess,
          isGuestAccessible: validatedData.isGuestAccessible,
          createdById: validatedData.createdById,
          courseId: validatedData.courseId || null,
          moduleId: validatedData.moduleId || null,
          lessonId: validatedData.lessonId || null,
        },
      })

      // Crear las preguntas del examen directamente
      if (validatedData.questions) {
        for (const questionData of validatedData.questions) {
          // ESSAY type doesn't require correctAnswer (includes audio/image questions)
          const correctAnswer: Prisma.InputJsonValue | typeof Prisma.JsonNull =
            questionData.type === 'ESSAY' ? Prisma.JsonNull : (questionData.correctAnswer ?? '')

          await tx.examQuestion.create({
            data: {
              examId: exam.id,
              type: questionData.type,
              question: questionData.question,
              options: questionData.options as Prisma.InputJsonValue,
              correctAnswer,
              explanation: questionData.explanation,
              points: questionData.points,
              order: questionData.order,
              difficulty: questionData.difficulty,
              tags: questionData.tags,
              caseSensitive: questionData.caseSensitive,
              partialCredit: questionData.partialCredit,
              minLength: questionData.minLength,
              maxLength: questionData.maxLength,
              audioUrl: questionData.audioUrl,
              audioPosition: questionData.audioPosition || 'BEFORE_QUESTION',
              maxAudioPlays: questionData.maxAudioPlays,
              audioAutoplay: questionData.audioAutoplay || false,
              audioPausable: questionData.audioPausable || false,
            },
          })
        }
      }

      return exam
    })

    revalidatePath('/admin/exams')
    return { success: true, exam: result }
  } catch (error) {
    console.error('Error creating exam:', error)
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Datos de validación incorrectos', details: error.errors }
    }
    return { success: false, error: 'Error al crear el examen' }
  }
}

export async function updateExam(
  id: string,
  data: z.infer<typeof EditExamSchema>
): Promise<ExamUpdateResponse> {
  try {
    const validatedData = EditExamSchema.parse(data)

    const result = await db.$transaction(async (tx) => {
      // Actualizar el examen principal
      const exam = await tx.exam.update({
        where: { id },
        data: {
          title: validatedData.title,
          description: validatedData.description,
          instructions: validatedData.instructions,
          timeLimit: validatedData.timeLimit,
          passingScore: validatedData.passingScore,
          maxAttempts: validatedData.maxAttempts,
          isBlocking: validatedData.isBlocking,
          isOptional: validatedData.isOptional,
          shuffleQuestions: validatedData.shuffleQuestions,
          shuffleOptions: validatedData.shuffleOptions,
          showResults: validatedData.showResults,
          allowReview: validatedData.allowReview,
          isPublished: validatedData.isPublished,
          proctoringEnabled: validatedData.proctoringEnabled,
          requireFullscreen: validatedData.requireFullscreen,
          blockCopyPaste: validatedData.blockCopyPaste,
          blockRightClick: validatedData.blockRightClick,
          maxWarnings: validatedData.maxWarnings,
          // Placement test fields
          examType: validatedData.examType,
          targetLanguage: validatedData.targetLanguage,
          slug: validatedData.slug,
          isPublicAccess: validatedData.isPublicAccess,
          isGuestAccessible: validatedData.isGuestAccessible,
          // Course assignment
          courseId: validatedData.courseId || null,
          moduleId: validatedData.moduleId || null,
          lessonId: validatedData.lessonId || null,
        },
      })

      // Si se proporcionan preguntas, actualizar completamente
      if (validatedData.questions) {
        // PROTECCIÓN: Verificar si hay respuestas de estudiantes antes de eliminar preguntas
        const existingAnswersCount = await tx.examAnswer.count({
          where: {
            question: { examId: id }
          }
        })

        if (existingAnswersCount > 0) {
          throw new Error(`ANSWERS_EXIST:${existingAnswersCount}`)
        }

        // Eliminar preguntas existentes (las respuestas se eliminarán por CASCADE)
        await tx.examQuestion.deleteMany({
          where: { examId: id },
        })

        // Crear nuevas preguntas
        for (const questionData of validatedData.questions) {
          // ESSAY type doesn't require correctAnswer (includes audio/image questions)
          const correctAnswer: Prisma.InputJsonValue | typeof Prisma.JsonNull =
            questionData.type === 'ESSAY' ? Prisma.JsonNull : (questionData.correctAnswer ?? '')

          await tx.examQuestion.create({
            data: {
              examId: exam.id,
              type: questionData.type,
              question: questionData.question,
              options: questionData.options as Prisma.InputJsonValue,
              correctAnswer,
              explanation: questionData.explanation,
              points: questionData.points,
              order: questionData.order,
              difficulty: questionData.difficulty,
              tags: questionData.tags,
              caseSensitive: questionData.caseSensitive,
              partialCredit: questionData.partialCredit,
              minLength: questionData.minLength,
              maxLength: questionData.maxLength,
              audioUrl: questionData.audioUrl,
              audioPosition: questionData.audioPosition || 'BEFORE_QUESTION',
              maxAudioPlays: questionData.maxAudioPlays,
              audioAutoplay: questionData.audioAutoplay || false,
              audioPausable: questionData.audioPausable || false,
            },
          })
        }
      }

      return exam
    })

    revalidatePath('/admin/exams')
    return { success: true, exam: result }
  } catch (error) {
    console.error('Error updating exam:', error)
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Datos de validación incorrectos', details: error.errors }
    }
    // Manejar error de respuestas existentes
    if (error instanceof Error && error.message.startsWith('ANSWERS_EXIST:')) {
      const count = parseInt(error.message.split(':')[1], 10)
      return {
        success: false,
        error: `No se pueden modificar las preguntas porque hay ${count} respuesta(s) de estudiantes. Esto eliminaría permanentemente sus respuestas y calificaciones.`,
      }
    }
    return { success: false, error: 'Error al actualizar el examen' }
  }
}

export async function deleteExam(id: string): Promise<ExamDeleteResponse> {
  try {
    // Verificar si el examen tiene intentos de estudiantes
    const attemptCount = await db.examAttempt.count({
      where: { examId: id },
    })

    if (attemptCount > 0) {
      return { success: false, error: 'No se puede eliminar un examen con intentos de estudiantes' }
    }

    await db.exam.delete({
      where: { id },
    })

    revalidatePath('/admin/exams')
    return { success: true }
  } catch (error) {
    console.error('Error deleting exam:', error)
    return { success: false, error: 'Error al eliminar el examen' }
  }
}

export async function getExamStats(): Promise<ExamStats> {
  try {
    const [totalExams, publishedExams, totalAttempts, passedAttempts] = await Promise.all([
      db.exam.count(),
      db.exam.count({
        where: { isPublished: true },
      }),
      db.examAttempt.count(),
      db.examAttempt.count({
        where: {
          status: AttemptStatus.COMPLETED,
          score: { gte: 70 }, // Asumiendo 70% como aprobatorio
        },
      }),
    ])

    return {
      totalExams,
      publishedExams,
      unpublishedExams: totalExams - publishedExams,
      totalAttempts,
      passedAttempts,
      passRate: totalAttempts > 0 ? Math.round((passedAttempts / totalAttempts) * 100) : 0,
    }
  } catch (error) {
    console.error('Error fetching exam stats:', error)
    throw new Error('Error al obtener estadísticas de exámenes')
  }
}

export async function getCoursesForExams() {
  try {
    const courses = await db.course.findMany({
      include: {
        modules: {
          select: {
            id: true,
            title: true,
            level: true,
            order: true,
            lessons: {
              select: {
                id: true,
                title: true,
                order: true,
              },
            },
          },
        },
      },
      orderBy: { title: 'asc' },
    })

    return courses
  } catch (error) {
    console.error('Error fetching courses for exams:', error)
    throw new Error('Error al obtener cursos para exámenes')
  }
}

export async function assignExamToStudents(
  data: z.infer<typeof AssignExamSchema>
): Promise<ExamAssignResponse> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'No autorizado' }
    }

    const currentUserId = session.user.id
    const validatedData = AssignExamSchema.parse(data)

    const assignments = await Promise.all(
      validatedData.studentIds.map((studentId) =>
        db.examAssignment.upsert({
          where: {
            examId_userId: {
              examId: validatedData.examId,
              userId: studentId,
            },
          },
          update: {
            dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : null,
            instructions: validatedData.instructions,
            status: AssignmentStatus.ASSIGNED,
          },
          create: {
            examId: validatedData.examId,
            userId: studentId,
            assignedBy: currentUserId,
            dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : null,
            instructions: validatedData.instructions,
            status: AssignmentStatus.ASSIGNED,
          },
        })
      )
    )

    revalidatePath('/admin/exams')
    return { success: true, assignments }
  } catch (error) {
    console.error('Error assigning exam to students:', error)
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Datos de validación incorrectos', details: error.errors }
    }
    return { success: false, error: 'Error al asignar examen a estudiantes' }
  }
}

// =============================================
// FUNCIONES PARA INTENTOS DE EXAMEN (ESTUDIANTES)
// =============================================

export async function startExamAttempt(examId: string, userId: string) {
  try {
    const exam = await db.exam.findUnique({
      where: { id: examId },
      include: {
        questions: {
          orderBy: { order: 'asc' },
        },
      },
    })

    if (!exam) {
      return { success: false, error: 'Examen no encontrado' }
    }

    if (!exam.isPublished) {
      return { success: false, error: 'Este examen no está disponible' }
    }

    // Primero verificar si hay un intento en progreso (permitir continuar)
    const inProgressAttempt = await db.examAttempt.findFirst({
      where: { examId, userId, status: AttemptStatus.IN_PROGRESS },
    })

    if (inProgressAttempt) {
      return {
        success: true,
        attempt: inProgressAttempt,
        exam,
        isResuming: true,
      }
    }

    // Solo verificar límite de intentos si no hay uno en progreso
    const existingAttempts = await db.examAttempt.count({
      where: { examId, userId },
    })

    if (existingAttempts >= exam.maxAttempts) {
      return { success: false, error: 'Has alcanzado el número máximo de intentos' }
    }

    const attempt = await db.examAttempt.create({
      data: {
        examId,
        userId,
        attemptNumber: existingAttempts + 1,
        status: AttemptStatus.IN_PROGRESS,
        startedAt: new Date(),
      },
    })

    return { success: true, attempt, exam, isResuming: false }
  } catch (error) {
    console.error('Error starting exam attempt:', error)
    return { success: false, error: 'Error al iniciar el intento de examen' }
  }
}

export async function saveExamAnswer(
  attemptId: string,
  questionId: string,
  answer: unknown,
  timeSpent?: number
) {
  try {
    // Validar sesión del usuario
    const session = await auth()
    if (!session?.user?.id) {
      return { 
        success: false, 
        error: 'Sesión expirada', 
        code: 'SESSION_EXPIRED',
        requiresReauth: true 
      }
    }

    const attempt = await db.examAttempt.findUnique({
      where: { id: attemptId },
      include: { exam: true },
    })

    if (!attempt) {
      return { success: false, error: 'Intento no encontrado' }
    }

    // Verificar que el intento pertenece al usuario autenticado
    if (attempt.userId !== session.user.id) {
      return { 
        success: false, 
        error: 'No autorizado para este intento',
        code: 'UNAUTHORIZED'
      }
    }

    if (attempt.status !== AttemptStatus.IN_PROGRESS) {
      return { success: false, error: 'Este intento ya fue enviado' }
    }

    const question = await db.examQuestion.findUnique({
      where: { id: questionId },
    })

    if (!question) {
      return { success: false, error: 'Pregunta no encontrada' }
    }

    const isAutoGradable = ['MULTIPLE_CHOICE', 'TRUE_FALSE', 'FILL_BLANK', 'SHORT_ANSWER'].includes(
      question.type
    )
    let isCorrect: boolean | null = null
    let pointsEarned = 0
    let needsReview = false

    if (isAutoGradable && answer !== null && answer !== undefined) {
      const correctAnswer = question.correctAnswer as string | string[]

      // Verificar si es una pregunta de opción múltiple con múltiples pasos (answer es un objeto con IDs)
      if (typeof answer === 'object' && answer !== null && !Array.isArray(answer)) {
        // Para preguntas multi-step, comparar cada respuesta individual
        const userAnswers = answer as Record<string, string>
        let correctAnswerArray: string[] = []

        if (typeof correctAnswer === 'string') {
          // El correctAnswer puede estar guardado como string separado por comas
          correctAnswerArray = correctAnswer.split(',').map((s) => s.trim())
        } else if (Array.isArray(correctAnswer)) {
          correctAnswerArray = correctAnswer
        }

        // Obtener los items de la pregunta para mapear correctamente
        const options = question.options as Record<string, unknown> | null
        const multipleChoiceItems = options?.multipleChoiceItems as
          | Array<{ id: string; options: Array<{ id: string }> }>
          | undefined

        if (multipleChoiceItems && multipleChoiceItems.length > 0) {
          // Verificar si el estudiante respondió al menos una pregunta
          const hasAnyAnswer =
            Object.keys(userAnswers).length > 0 &&
            Object.values(userAnswers).some((v) => v !== null && v !== undefined && v !== '')

          if (!hasAnyAnswer) {
            // Si no hay ninguna respuesta, marcar como incorrecto con 0 puntos
            isCorrect = false
            pointsEarned = 0
          } else {
            // Comparar cada respuesta del usuario con la respuesta correcta correspondiente
            let allCorrect = true
            let correctCount = 0

            multipleChoiceItems.forEach((item, index) => {
              const userOptionId = userAnswers[item.id]
              const correctOptionId = correctAnswerArray[index]

              if (userOptionId === correctOptionId) {
                correctCount++
              } else {
                allCorrect = false
              }
            })

            isCorrect = allCorrect
            // Puntos parciales: proporción de respuestas correctas
            pointsEarned = Math.round((correctCount / multipleChoiceItems.length) * question.points)
          }
        } else {
          // Fallback: comparar valores directamente
          const userValues = Object.values(userAnswers).filter(
            (v) => v !== null && v !== undefined && v !== ''
          )
          if (userValues.length === 0) {
            isCorrect = false
            pointsEarned = 0
          } else {
            const correctValues = correctAnswerArray.sort()
            isCorrect = JSON.stringify(userValues.sort()) === JSON.stringify(correctValues)
            pointsEarned = isCorrect ? question.points : 0
          }
        }
      } else {
        // Para respuestas simples (string)
        const userAnswer = String(answer).trim()

        if (Array.isArray(correctAnswer)) {
          isCorrect = correctAnswer.some((ca) =>
            question.caseSensitive
              ? ca === userAnswer
              : ca.toLowerCase() === userAnswer.toLowerCase()
          )
        } else {
          isCorrect = question.caseSensitive
            ? correctAnswer === userAnswer
            : correctAnswer.toLowerCase() === userAnswer.toLowerCase()
        }

        pointsEarned = isCorrect ? question.points : 0
      }
    } else {
      needsReview = true
    }

    const savedAnswer = await db.examAnswer.upsert({
      where: {
        attemptId_questionId: {
          attemptId,
          questionId,
        },
      },
      update: {
        answer: answer as object,
        isCorrect,
        pointsEarned,
        needsReview,
        timeSpent,
      },
      create: {
        attemptId,
        questionId,
        answer: answer as object,
        isCorrect,
        pointsEarned,
        needsReview,
        timeSpent,
      },
    })

    return { success: true, answer: savedAnswer }
  } catch (error) {
    console.error('Error saving exam answer:', error)
    return { success: false, error: 'Error al guardar la respuesta' }
  }
}

// Función para generar código de verificación único
function generateVerificationCode(attemptId: string): string {
  // Generar código único basado en el ID del intento
  const hash = attemptId.slice(-6).toUpperCase()
  return `LW-EXAM-${hash}`
}

export async function submitExamAttempt(attemptId: string) {
  try {
    // Validar sesión del usuario
    const session = await auth()
    if (!session?.user?.id) {
      return { 
        success: false, 
        error: 'Sesión expirada', 
        code: 'SESSION_EXPIRED',
        requiresReauth: true 
      }
    }

    const attempt = await db.examAttempt.findUnique({
      where: { id: attemptId },
      include: {
        answers: {
          include: { question: true },
        },
        exam: {
          include: {
            questions: true,
          },
        },
      },
    })

    if (!attempt) {
      return { success: false, error: 'Intento no encontrado' }
    }

    // Verificar que el intento pertenece al usuario autenticado
    if (attempt.userId !== session.user.id) {
      return { 
        success: false, 
        error: 'No autorizado para este intento',
        code: 'UNAUTHORIZED'
      }
    }

    if (attempt.status !== AttemptStatus.IN_PROGRESS) {
      return { success: false, error: 'Este intento ya fue enviado' }
    }

    // Tipos de bloques informativos que no requieren respuesta
    const INFORMATIVE_BLOCK_TYPES = ['title', 'text', 'audio', 'video', 'image']

    const allQuestions = attempt.exam.questions
    // Filtrar solo preguntas que requieren respuesta (excluyendo bloques informativos)
    const answerableQuestions = allQuestions.filter((q) => {
      const options = q.options as Record<string, unknown> | null
      const blockType = options?.originalBlockType as string | undefined
      return !blockType || !INFORMATIVE_BLOCK_TYPES.includes(blockType)
    })

    const maxPoints = answerableQuestions.reduce((sum, q) => sum + q.points, 0)
    const totalPoints = attempt.answers.reduce((sum, a) => sum + a.pointsEarned, 0)
    const hasPendingReview = attempt.answers.some((a) => a.needsReview)

    const score = maxPoints > 0 ? (totalPoints / maxPoints) * 100 : 0
    const timeSpent = Math.round((new Date().getTime() - attempt.startedAt.getTime()) / 60000)

    // Calcular nivel recomendado si es un placement test
    const recommendedLevel =
      attempt.exam.examType === ExamType.PLACEMENT_TEST
        ? calculateRecommendedLevel(score)
        : undefined

    // Generar código de verificación
    const verificationCode = generateVerificationCode(attemptId)

    const updatedAttempt = await db.examAttempt.update({
      where: { id: attemptId },
      data: {
        status: hasPendingReview ? AttemptStatus.SUBMITTED : AttemptStatus.COMPLETED,
        score: Math.round(score * 100) / 100,
        totalPoints,
        maxPoints,
        timeSpent,
        submittedAt: new Date(),
        verificationCode,
        ...(recommendedLevel && { recommendedLevel }),
      },
    })

    revalidatePath('/exams')
    return { success: true, attempt: updatedAttempt }
  } catch (error) {
    console.error('Error submitting exam attempt:', error)
    return { success: false, error: 'Error al enviar el examen' }
  }
}

export async function getExamAttemptWithAnswers(attemptId: string) {
  try {
    const attempt = await db.examAttempt.findUnique({
      where: { id: attemptId },
      include: {
        exam: {
          include: {
            course: { select: { title: true } },
            questions: {
              orderBy: { order: 'asc' },
            },
          },
        },
        answers: {
          include: {
            question: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            lastName: true,
            email: true,
          },
        },
      },
    })

    if (!attempt) {
      return { success: false, error: 'Intento no encontrado' }
    }

    return { success: true, attempt }
  } catch (error) {
    console.error('Error fetching exam attempt:', error)
    return { success: false, error: 'Error al obtener el intento de examen' }
  }
}

export async function getExamResultsForStudent(
  attemptId: string, 
  userId: string,
  options?: { userRoles?: string[] }
) {
  try {
    const userRoles = options?.userRoles || []
    const isAdmin = userRoles.includes('ADMIN')
    const isTeacher = userRoles.includes('TEACHER')

    // Primero obtener el attempt sin filtro de userId para verificar permisos
    const attempt = await db.examAttempt.findUnique({
      where: { id: attemptId },
      include: {
        exam: {
          select: {
            id: true,
            title: true,
            description: true,
            passingScore: true,
            showResults: true,
            allowReview: true,
            courseId: true,
            questions: {
              select: {
                id: true,
                type: true,
                question: true,
                options: true,
                correctAnswer: true,
                explanation: true,
                points: true,
                tags: true,
                order: true,
                partialCredit: true,
              },
              orderBy: { order: 'asc' },
            },
          },
        },
        answers: {
          include: {
            question: {
              select: {
                id: true,
                type: true,
                question: true,
                options: true,
                correctAnswer: true,
                explanation: true,
                points: true,
                tags: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            lastName: true,
            email: true,
          },
        },
      },
    })

    if (!attempt) {
      return { success: false, error: 'Resultados no encontrados' }
    }

    // Verificar permisos de acceso
    const isOwner = attempt.userId === userId
    let hasAccess = isOwner || isAdmin

    // Si es profesor, verificar si es el profesor del período activo del curso
    if (!hasAccess && isTeacher && attempt.exam.courseId) {
      // Buscar si el profesor tiene una inscripción activa como profesor en este curso
      const teacherEnrollment = await db.enrollment.findFirst({
        where: {
          courseId: attempt.exam.courseId,
          studentId: attempt.userId, // El estudiante que tomó el examen
          teacherId: userId, // El profesor que quiere ver los resultados
          status: 'ACTIVE',
          academicPeriod: {
            isActive: true,
          },
        },
      })

      if (teacherEnrollment) {
        hasAccess = true
      }
    }

    if (!hasAccess) {
      return { success: false, error: 'No tienes permiso para ver estos resultados' }
    }

    if (attempt.status === AttemptStatus.IN_PROGRESS) {
      return { success: false, error: 'El examen aún no ha sido enviado' }
    }

    return { success: true, attempt, isOwner }
  } catch (error) {
    console.error('Error fetching exam results:', error)
    return { success: false, error: 'Error al obtener los resultados' }
  }
}

// =============================================
// FUNCIONES PARA CALIFICACIÓN (PROFESORES)
// =============================================

export async function getAttemptsForGrading(examId: string) {
  try {
    const attempts = await db.examAttempt.findMany({
      where: {
        examId,
        status: { in: [AttemptStatus.SUBMITTED, AttemptStatus.COMPLETED] },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            lastName: true,
            email: true,
          },
        },
        answers: {
          where: { needsReview: true },
        },
      },
      orderBy: { submittedAt: 'desc' },
    })

    return { success: true, attempts }
  } catch (error) {
    console.error('Error fetching attempts for grading:', error)
    return { success: false, error: 'Error al obtener intentos para calificar' }
  }
}

export async function createEmptyAnswer(questionId: string, attemptId: string) {
  try {
    // Verificar que el attempt existe
    const attempt = await db.examAttempt.findUnique({
      where: { id: attemptId },
    })

    if (!attempt) {
      return { success: false, error: 'Intento no encontrado' }
    }

    // Verificar que la pregunta existe
    const question = await db.examQuestion.findUnique({
      where: { id: questionId },
    })

    if (!question) {
      return { success: false, error: 'Pregunta no encontrada' }
    }

    // Verificar si ya existe una respuesta para esta pregunta
    const existingAnswer = await db.examAnswer.findFirst({
      where: {
        attemptId,
        questionId,
      },
    })

    if (existingAnswer) {
      return { success: true, answer: existingAnswer }
    }

    // Crear la respuesta vacía
    const newAnswer = await db.examAnswer.create({
      data: {
        attemptId,
        questionId,
        answer: '', // Sin respuesta del estudiante
        pointsEarned: 0,
        needsReview: true,
        isCorrect: false,
      },
    })

    revalidatePath('/teacher/grading')
    return { success: true, answer: newAnswer }
  } catch (error) {
    console.error('Error creating empty answer:', error)
    return { success: false, error: 'Error al crear respuesta vacía' }
  }
}

export async function gradeExamAnswer(
  answerId: string,
  pointsEarned: number,
  feedback: string,
  reviewerId: string
) {
  try {
    const answer = await db.examAnswer.findUnique({
      where: { id: answerId },
      include: { question: true },
    })

    if (!answer) {
      return { success: false, error: 'Respuesta no encontrada' }
    }

    if (pointsEarned > answer.question.points) {
      return { success: false, error: 'Los puntos no pueden exceder el máximo de la pregunta' }
    }

    const updatedAnswer = await db.examAnswer.update({
      where: { id: answerId },
      data: {
        pointsEarned,
        feedback,
        isCorrect: pointsEarned >= answer.question.points * 0.6,
        needsReview: false,
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
      },
    })

    const allAnswers = await db.examAnswer.findMany({
      where: { attemptId: answer.attemptId },
      include: { question: true },
    })

    const hasPendingReview = allAnswers.some((a) => a.needsReview)

    if (!hasPendingReview) {
      const totalPoints = allAnswers.reduce((sum, a) => sum + a.pointsEarned, 0)
      const maxPoints = allAnswers.reduce((sum, a) => sum + a.question.points, 0)
      const score = maxPoints > 0 ? (totalPoints / maxPoints) * 100 : 0

      await db.examAttempt.update({
        where: { id: answer.attemptId },
        data: {
          status: AttemptStatus.COMPLETED,
          score: Math.round(score * 100) / 100,
          totalPoints,
          reviewedAt: new Date(),
        },
      })
    }

    revalidatePath('/teacher/grading')
    return { success: true, answer: updatedAnswer }
  } catch (error) {
    console.error('Error grading exam answer:', error)
    return { success: false, error: 'Error al calificar la respuesta' }
  }
}

export async function finalizeExamReview(attemptId: string) {
  try {
    const attempt = await db.examAttempt.findUnique({
      where: { id: attemptId },
      include: {
        answers: {
          include: { question: true },
        },
      },
    })

    if (!attempt) {
      return { success: false, error: 'Intento no encontrado' }
    }

    const pendingAnswers = attempt.answers.filter((a) => a.needsReview)
    if (pendingAnswers.length > 0) {
      return {
        success: false,
        error: `Aún hay ${pendingAnswers.length} pregunta(s) pendientes de revisión`,
      }
    }

    const totalPoints = attempt.answers.reduce((sum, a) => sum + a.pointsEarned, 0)
    const maxPoints = attempt.answers.reduce((sum, a) => sum + a.question.points, 0)
    const score = maxPoints > 0 ? (totalPoints / maxPoints) * 100 : 0

    const updatedAttempt = await db.examAttempt.update({
      where: { id: attemptId },
      data: {
        status: AttemptStatus.COMPLETED,
        score: Math.round(score * 100) / 100,
        totalPoints,
        maxPoints,
        reviewedAt: new Date(),
      },
    })

    revalidatePath('/teacher/grading')
    return { success: true, attempt: updatedAttempt }
  } catch (error) {
    console.error('Error finalizing exam review:', error)
    return { success: false, error: 'Error al finalizar la revisión' }
  }
}

// =============================================
// FUNCIONES PARA PLACEMENT TESTS
// =============================================

import type {
  LanguageLevel,
  PlacementTestWithDetails,
  PlacementTestResult,
  RecommendedCourse,
} from '@/types/exam'
import { ExamType } from '@prisma/client'
import { sendPlacementTestResultEmail } from '@/lib/mail'

const LEVEL_DESCRIPTIONS: Record<LanguageLevel, string> = {
  A1: 'Principiante',
  A2: 'Elemental',
  B1: 'Intermedio',
  B2: 'Intermedio Alto',
  C1: 'Avanzado',
  C2: 'Maestría',
}

/**
 * Calcula el nivel recomendado basado en el puntaje (función interna)
 */
function calculateRecommendedLevel(score: number): LanguageLevel {
  if (score <= 20) return 'A1'
  if (score <= 40) return 'A2'
  if (score <= 60) return 'B1'
  if (score <= 80) return 'B2'
  if (score <= 90) return 'C1'
  return 'C2'
}

/**
 * Obtiene todos los placement tests publicados disponibles para usuarios GUEST
 */
export async function getPlacementTests(userId?: string): Promise<PlacementTestWithDetails[]> {
  try {
    const placementTests = await db.exam.findMany({
      where: {
        examType: ExamType.PLACEMENT_TEST,
        isGuestAccessible: true,
        isPublished: true,
      },
      include: {
        questions: true,
        attempts: userId
          ? {
              where: { userId },
              orderBy: { createdAt: 'desc' },
              take: 1,
            }
          : false,
      },
      orderBy: { title: 'asc' },
    })

    return placementTests.map((exam) => {
      const totalQuestions = exam.questions.length
      const lastAttempt = exam.attempts?.[0]

      return {
        id: exam.id,
        title: exam.title,
        description: exam.description,
        targetLanguage: exam.targetLanguage || 'en',
        timeLimit: exam.timeLimit,
        totalQuestions,
        isPublished: exam.isPublished,
        hasAttempted: !!lastAttempt,
        lastAttemptLevel: lastAttempt?.recommendedLevel as LanguageLevel | undefined,
      }
    })
  } catch (error) {
    console.error('Error fetching placement tests:', error)
    return []
  }
}

/**
 * Verifica si un usuario GUEST puede tomar un placement test
 * (solo 1 intento por idioma)
 */
export async function canUserTakePlacementTest(
  examId: string,
  userId: string
): Promise<{
  canTake: boolean
  reason?: string
  existingAttempt?: { level: string; completedAt: Date }
}> {
  try {
    const exam = await db.exam.findUnique({
      where: { id: examId },
      select: {
        examType: true,
        isGuestAccessible: true,
        isPublished: true,
        targetLanguage: true,
      },
    })

    if (!exam) {
      return { canTake: false, reason: 'Examen no encontrado' }
    }

    if (exam.examType !== ExamType.PLACEMENT_TEST) {
      return { canTake: false, reason: 'Este no es un test de clasificación' }
    }

    if (!exam.isGuestAccessible) {
      return { canTake: false, reason: 'Este test no está disponible para usuarios invitados' }
    }

    if (!exam.isPublished) {
      return { canTake: false, reason: 'Este test no está publicado' }
    }

    // Verificar si ya tiene un intento completado para este idioma
    const existingAttempt = await db.examAttempt.findFirst({
      where: {
        userId,
        exam: {
          examType: ExamType.PLACEMENT_TEST,
          targetLanguage: exam.targetLanguage,
        },
        status: AttemptStatus.COMPLETED,
      },
      select: {
        recommendedLevel: true,
        submittedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    if (existingAttempt) {
      return {
        canTake: false,
        reason: `Ya completaste un test de clasificación para este idioma. Tu nivel es ${existingAttempt.recommendedLevel}.`,
        existingAttempt: {
          level: existingAttempt.recommendedLevel || 'A1',
          completedAt: existingAttempt.submittedAt || new Date(),
        },
      }
    }

    return { canTake: true }
  } catch (error) {
    console.error('Error checking placement test eligibility:', error)
    return { canTake: false, reason: 'Error al verificar elegibilidad' }
  }
}

/**
 * @deprecated Usar submitExamAttempt() en su lugar - ahora maneja placement tests automáticamente
 * Completa un placement test y calcula el nivel recomendado
 * NOTA: Esta función se mantiene temporalmente para referencia del envío de emails
 */
export async function completePlacementTest(
  attemptId: string
): Promise<{ success: boolean; result?: PlacementTestResult; error?: string }> {
  try {
    const attempt = await db.examAttempt.findUnique({
      where: { id: attemptId },
      include: {
        exam: true,
        user: {
          select: { id: true, email: true, name: true },
        },
        answers: {
          include: { question: true },
        },
      },
    })

    if (!attempt) {
      return { success: false, error: 'Intento no encontrado' }
    }

    if (attempt.exam.examType !== ExamType.PLACEMENT_TEST) {
      return { success: false, error: 'Este no es un test de clasificación' }
    }

    // Calcular puntaje
    const totalPoints = attempt.answers.reduce((sum, a) => sum + a.pointsEarned, 0)
    const maxPoints = attempt.answers.reduce((sum, a) => sum + a.question.points, 0)
    const score = maxPoints > 0 ? (totalPoints / maxPoints) * 100 : 0

    // Calcular nivel recomendado
    const recommendedLevel = calculateRecommendedLevel(score)

    // Actualizar intento con resultados
    const updatedAttempt = await db.examAttempt.update({
      where: { id: attemptId },
      data: {
        status: AttemptStatus.COMPLETED,
        score: Math.round(score * 100) / 100,
        totalPoints,
        maxPoints,
        recommendedLevel,
        submittedAt: new Date(),
      },
    })

    const result: PlacementTestResult = {
      attemptId: updatedAttempt.id,
      examId: attempt.examId,
      userId: attempt.userId,
      score: updatedAttempt.score || 0,
      recommendedLevel,
      targetLanguage: attempt.exam.targetLanguage || 'en',
      completedAt: updatedAttempt.submittedAt || new Date(),
      timeSpent: updatedAttempt.timeSpent || 0,
    }

    // Enviar email con resultados
    if (attempt.user?.email) {
      try {
        await sendPlacementTestResultEmail(attempt.user.email, {
          userName: attempt.user.name || 'Estudiante',
          language: attempt.exam.targetLanguage || 'en',
          level: recommendedLevel,
          levelDescription: LEVEL_DESCRIPTIONS[recommendedLevel],
          score: updatedAttempt.score || 0,
          completedAt: new Date().toLocaleDateString('es-PE', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }),
        })

        // Marcar que se envió el email
        await db.examAttempt.update({
          where: { id: attemptId },
          data: { resultEmailSent: true },
        })
      } catch (emailError) {
        console.error('Error sending placement test result email:', emailError)
      }
    }

    revalidatePath('/placement-test')
    return { success: true, result }
  } catch (error) {
    console.error('Error completing placement test:', error)
    return { success: false, error: 'Error al completar el test de clasificación' }
  }
}

/**
 * Obtiene cursos recomendados basados en el nivel del placement test
 */
export async function getRecommendedCourses(
  level: LanguageLevel,
  language: string
): Promise<RecommendedCourse[]> {
  try {
    const courses = await db.course.findMany({
      where: {
        language: { contains: language, mode: 'insensitive' },
        level: { contains: level, mode: 'insensitive' },
        isPublished: true,
      },
      select: {
        id: true,
        title: true,
        description: true,
        language: true,
        level: true,
        image: true,
      },
      take: 6,
    })

    return courses
  } catch (error) {
    console.error('Error fetching recommended courses:', error)
    return []
  }
}

/**
 * Obtiene el resultado del placement test de un usuario
 */
export async function getPlacementTestResult(
  userId: string,
  language?: string
): Promise<PlacementTestResult | null> {
  try {
    const attempt = await db.examAttempt.findFirst({
      where: {
        userId,
        exam: {
          examType: ExamType.PLACEMENT_TEST,
          ...(language && { targetLanguage: language }),
        },
        status: AttemptStatus.COMPLETED,
      },
      include: {
        exam: {
          select: { targetLanguage: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!attempt || !attempt.recommendedLevel) {
      return null
    }

    return {
      attemptId: attempt.id,
      examId: attempt.examId,
      userId: attempt.userId,
      score: attempt.score || 0,
      recommendedLevel: attempt.recommendedLevel as LanguageLevel,
      targetLanguage: attempt.exam.targetLanguage || 'en',
      completedAt: attempt.submittedAt || attempt.createdAt,
      timeSpent: attempt.timeSpent || 0,
    }
  } catch (error) {
    console.error('Error fetching placement test result:', error)
    return null
  }
}

/**
 * Marca que se envió el email de resultados
 */
export async function markResultEmailSent(attemptId: string): Promise<boolean> {
  try {
    await db.examAttempt.update({
      where: { id: attemptId },
      data: { resultEmailSent: true },
    })
    return true
  } catch (error) {
    console.error('Error marking result email sent:', error)
    return false
  }
}

/**
 * Obtiene un examen por su slug
 */
export async function getExamBySlug(slug: string) {
  try {
    const exam = await db.exam.findUnique({
      where: { slug },
      include: {
        creator: {
          select: { id: true, name: true, email: true, image: true },
        },
        course: {
          select: { id: true, title: true, language: true, level: true, isPersonalized: true },
        },
        module: {
          select: { id: true, title: true, level: true },
        },
        lesson: {
          select: { id: true, title: true },
        },
        questions: {
          orderBy: { order: 'asc' },
        },
      },
    })
    return exam
  } catch (error) {
    console.error('Error getting exam by slug:', error)
    return null
  }
}

/**
 * Obtiene usuarios no-admin para asignar exámenes
 */
export async function getNonAdminUsersForExamAssignment() {
  try {
    const users = await db.user.findMany({
      where: {
        NOT: {
          roles: {
            has: UserRole.ADMIN,
          },
        },
      },
      select: {
        id: true,
        name: true,
        lastName: true,
        email: true,
        image: true,
        enrollments: {
          where: {
            status: 'ACTIVE',
          },
          select: {
            course: {
              select: {
                title: true,
                language: true,
              },
            },
          },
        },
      },
      orderBy: [{ name: 'asc' }, { lastName: 'asc' }],
    })

    return {
      success: true,
      users: users.map((user) => ({
        id: user.id,
        name: user.name,
        lastName: user.lastName,
        email: user.email,
        image: user.image,
        enrollments: user.enrollments,
      })),
    }
  } catch (error) {
    console.error('Error fetching non-admin users:', error)
    return { success: false, error: 'Error al obtener usuarios', users: [] }
  }
}

/**
 * Obtiene exámenes asignados pendientes para un usuario GUEST
 */
export async function getPendingExamsForGuest(userId: string) {
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { roles: true },
    })

    if (!user || !user.roles.includes(UserRole.GUEST)) {
      return { success: true, exams: [] }
    }

    const assignments = await db.examAssignment.findMany({
      where: {
        userId: userId,
        status: AssignmentStatus.ASSIGNED,
      },
      include: {
        exam: {
          select: {
            id: true,
            title: true,
            slug: true,
            timeLimit: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 1,
    })

    return {
      success: true,
      exams: assignments.map((a) => ({
        id: a.exam.id,
        title: a.exam.title,
        slug: a.exam.slug,
        timeLimit: a.exam.timeLimit,
        dueDate: a.dueDate,
      })),
    }
  } catch (error) {
    console.error('Error fetching pending exams for guest:', error)
    return { success: false, exams: [] }
  }
}

/**
 * Verifica si un usuario puede acceder a un examen por slug
 */
export async function canAccessExamBySlug(
  slug: string,
  userId?: string
): Promise<{
  canAccess: boolean
  reason?: string
  exam?: Awaited<ReturnType<typeof getExamBySlug>>
}> {
  try {
    const exam = await getExamBySlug(slug)

    if (!exam) {
      return { canAccess: false, reason: 'Examen no encontrado' }
    }

    if (!exam.isPublished) {
      return { canAccess: false, reason: 'Este examen no está publicado' }
    }

    // Si es público, cualquiera puede acceder
    if (exam.isPublicAccess) {
      return { canAccess: true, exam }
    }

    // Si no es público, necesita estar asignado
    if (!userId) {
      return { canAccess: false, reason: 'Debes iniciar sesión para acceder a este examen' }
    }

    // Verificar si el usuario tiene asignación
    const assignment = await db.examAssignment.findUnique({
      where: {
        examId_userId: {
          examId: exam.id,
          userId,
        },
      },
    })

    if (!assignment) {
      return { canAccess: false, reason: 'No tienes acceso a este examen' }
    }

    return { canAccess: true, exam }
  } catch (error) {
    console.error('Error checking exam access:', error)
    return { canAccess: false, reason: 'Error al verificar acceso' }
  }
}

// Función para obtener intento de examen por código de verificación (público)
export async function getExamAttemptByVerificationCode(code: string): Promise<{
  id: string
  attemptNumber: number
  status: string
  score: number | null
  totalPoints: number | null
  maxPoints: number | null
  submittedAt: string
  verificationCode: string
  allowPublicVerification: boolean
  user: {
    id: string
    name: string
    email: string
  }
  exam: {
    id: string
    title: string
    course: {
      title: string
    }
  }
} | null> {
  try {
    if (!code || !code.startsWith('LW-EXAM-')) {
      return null
    }

    // Buscar intento por código de verificación directamente en la BD
    const attempt = await db.examAttempt.findFirst({
      where: {
        verificationCode: code,
        status: 'COMPLETED',
        allowPublicVerification: true,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            lastName: true,
            email: true,
          },
        },
        exam: {
          select: {
            id: true,
            title: true,
            course: {
              select: {
                title: true,
              },
            },
          },
        },
        answers: {
          include: {
            question: {
              select: {
                id: true,
                type: true,
                question: true,
                points: true,
              },
            },
          },
        },
      },
    })

    if (!attempt) {
      return null
    }

    // Transformar los datos para que coincidan con el formato esperado
    return {
      ...attempt,
      submittedAt: attempt.submittedAt
        ? attempt.submittedAt.toISOString()
        : new Date().toISOString(),
      verificationCode: code,
      allowPublicVerification: true,
      exam: {
        ...attempt.exam,
        course: attempt.exam.course || { title: 'N/A' },
      },
    }
  } catch (error) {
    console.error('Error getting exam attempt by verification code:', error)
    return null
  }
}

// =============================================
// PERSISTENCIA DE ESTADO DE NAVEGACIÓN Y FLAGS
// =============================================

export async function updateExamAttemptState(
  attemptId: string,
  state: {
    currentQuestionIndex?: number
    flaggedQuestions?: string[]
  }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'No autorizado' }
    }

    const attempt = await db.examAttempt.findUnique({
      where: { id: attemptId },
      select: { userId: true },
    })

    if (!attempt || attempt.userId !== session.user.id) {
      return { success: false, error: 'No autorizado para este intento' }
    }

    const updatedAttempt = await db.examAttempt.update({
      where: { id: attemptId },
      data: {
        currentQuestionIndex: state.currentQuestionIndex,
        flaggedQuestions: state.flaggedQuestions ? JSON.stringify(state.flaggedQuestions) : undefined,
        lastActivityAt: new Date(),
      },
    })

    return { success: true, attempt: updatedAttempt }
  } catch (error) {
    console.error('Error updating exam attempt state:', error)
    return { success: false, error: 'Error al actualizar estado' }
  }
}

export async function getExamAttemptWithState(attemptId: string) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'No autorizado' }
    }

    const attempt = await db.examAttempt.findUnique({
      where: { id: attemptId },
      include: {
        answers: {
          select: {
            questionId: true,
            answer: true,
          },
        },
      },
    })

    if (!attempt) {
      return { success: false, error: 'Intento no encontrado' }
    }

    if (attempt.userId !== session.user.id) {
      return { success: false, error: 'No autorizado para este intento' }
    }

    // Parsear flaggedQuestions si existe
    const flaggedQuestions = attempt.flaggedQuestions
      ? JSON.parse(attempt.flaggedQuestions as string)
      : []

    return {
      success: true,
      attempt: {
        ...attempt,
        flaggedQuestions,
      },
    }
  } catch (error) {
    console.error('Error getting exam attempt with state:', error)
    return { success: false, error: 'Error al obtener estado' }
  }
}
