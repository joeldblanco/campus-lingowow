'use server'

import { db } from '@/lib/db'
import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'
import { CreateExamSchema, EditExamSchema, AssignExamSchema } from '@/schemas/exams'
import * as z from 'zod'
import { AttemptStatus, AssignmentStatus, Prisma } from '@prisma/client'
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
        sections: {
          include: {
            questions: {
              orderBy: { order: 'asc' },
            },
          },
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
      sections: exam.sections.map((section) => ({
        ...section,
        questions: section.questions.map((question) => ({
          ...question,
          options: question.options as string[] | null,
          correctAnswer: question.correctAnswer as string | string[],
        })),
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
        sections: {
          include: {
            questions: {
              orderBy: { order: 'asc' },
            },
          },
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
      sections: exam.sections.map((section) => ({
        ...section,
        questions: section.questions.map((question) => ({
          ...question,
          options: question.options as string[] | null,
          correctAnswer: question.correctAnswer as string | string[],
        })),
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

    // Create a default section
    await db.examSection.create({
      data: {
        examId: exam.id,
        title: 'Sección Principal',
        description: '',
        order: 1,
        points: 0,
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
  }>
): Promise<ExamUpdateResponse> {
  try {
    const result = await db.$transaction(async (tx) => {
      // Get or create the main section
      let section = await tx.examSection.findFirst({
        where: { examId },
        orderBy: { order: 'asc' },
      })

      if (!section) {
        section = await tx.examSection.create({
          data: {
            examId,
            title: 'Sección Principal',
            description: '',
            order: 1,
            points: 0,
          },
        })
      }

      // Delete existing questions
      await tx.examQuestion.deleteMany({
        where: { sectionId: section.id },
      })

      // Create new questions
      for (const questionData of questions) {
        const correctAnswer =
          questionData.type === 'ESSAY' ? Prisma.JsonNull : (questionData.correctAnswer ?? '')

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
            sectionId: section.id,
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

      // Update section points
      const totalPoints = questions.reduce((sum, q) => sum + q.points, 0)
      await tx.examSection.update({
        where: { id: section.id },
        data: { points: totalPoints },
      })

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
          createdById: validatedData.createdById,
          courseId: validatedData.courseId || null,
          moduleId: validatedData.moduleId || null,
          lessonId: validatedData.lessonId || null,
        },
      })

      // Crear las secciones del examen
      for (const sectionData of validatedData.sections) {
        const section = await tx.examSection.create({
          data: {
            examId: exam.id,
            title: sectionData.title,
            description: sectionData.description,
            instructions: sectionData.instructions,
            timeLimit: sectionData.timeLimit,
            order: sectionData.order,
            points: sectionData.questions.reduce((sum, q) => sum + q.points, 0),
          },
        })

        // Crear las preguntas de cada sección
        for (const questionData of sectionData.questions) {
          // ESSAY type doesn't require correctAnswer (includes audio/image questions)
          const correctAnswer: Prisma.InputJsonValue | typeof Prisma.JsonNull =
            questionData.type === 'ESSAY' ? Prisma.JsonNull : (questionData.correctAnswer ?? '')

          await tx.examQuestion.create({
            data: {
              sectionId: section.id,
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
          courseId: validatedData.courseId || undefined,
          moduleId: validatedData.moduleId || undefined,
          lessonId: validatedData.lessonId || undefined,
        },
      })

      // Si se proporcionan secciones, actualizar completamente
      if (validatedData.sections) {
        // Eliminar secciones existentes (cascade eliminará preguntas)
        await tx.examSection.deleteMany({
          where: { examId: id },
        })

        // Crear nuevas secciones
        for (const sectionData of validatedData.sections) {
          const section = await tx.examSection.create({
            data: {
              examId: exam.id,
              title: sectionData.title,
              description: sectionData.description,
              instructions: sectionData.instructions,
              timeLimit: sectionData.timeLimit,
              order: sectionData.order,
              points: sectionData.questions.reduce((sum, q) => sum + q.points, 0),
            },
          })

          // Crear preguntas de la sección
          for (const questionData of sectionData.questions) {
            // ESSAY type doesn't require correctAnswer (includes audio/image questions)
            const correctAnswer: Prisma.InputJsonValue | typeof Prisma.JsonNull =
              questionData.type === 'ESSAY' ? Prisma.JsonNull : (questionData.correctAnswer ?? '')

            await tx.examQuestion.create({
              data: {
                sectionId: section.id,
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
        sections: {
          include: {
            questions: {
              orderBy: { order: 'asc' },
            },
          },
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
    const attempt = await db.examAttempt.findUnique({
      where: { id: attemptId },
      include: { exam: true },
    })

    if (!attempt) {
      return { success: false, error: 'Intento no encontrado' }
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
      const userAnswer = String(answer).trim()

      if (Array.isArray(correctAnswer)) {
        isCorrect = correctAnswer.some((ca) =>
          question.caseSensitive ? ca === userAnswer : ca.toLowerCase() === userAnswer.toLowerCase()
        )
      } else {
        isCorrect = question.caseSensitive
          ? correctAnswer === userAnswer
          : correctAnswer.toLowerCase() === userAnswer.toLowerCase()
      }

      pointsEarned = isCorrect ? question.points : 0
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

export async function submitExamAttempt(attemptId: string) {
  try {
    const attempt = await db.examAttempt.findUnique({
      where: { id: attemptId },
      include: {
        answers: {
          include: { question: true },
        },
        exam: {
          include: {
            sections: {
              include: { questions: true },
            },
          },
        },
      },
    })

    if (!attempt) {
      return { success: false, error: 'Intento no encontrado' }
    }

    if (attempt.status !== AttemptStatus.IN_PROGRESS) {
      return { success: false, error: 'Este intento ya fue enviado' }
    }

    const allQuestions = attempt.exam.sections.flatMap((s) => s.questions)
    const maxPoints = allQuestions.reduce((sum, q) => sum + q.points, 0)
    const totalPoints = attempt.answers.reduce((sum, a) => sum + a.pointsEarned, 0)
    const hasPendingReview = attempt.answers.some((a) => a.needsReview)

    const score = maxPoints > 0 ? (totalPoints / maxPoints) * 100 : 0
    const timeSpent = Math.round((new Date().getTime() - attempt.startedAt.getTime()) / 60000)

    const updatedAttempt = await db.examAttempt.update({
      where: { id: attemptId },
      data: {
        status: hasPendingReview ? AttemptStatus.SUBMITTED : AttemptStatus.COMPLETED,
        score: Math.round(score * 100) / 100,
        totalPoints,
        maxPoints,
        timeSpent,
        submittedAt: new Date(),
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
            sections: {
              include: {
                questions: {
                  orderBy: { order: 'asc' },
                },
              },
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

export async function getExamResultsForStudent(attemptId: string, userId: string) {
  try {
    const attempt = await db.examAttempt.findFirst({
      where: {
        id: attemptId,
        userId,
      },
      include: {
        exam: {
          select: {
            id: true,
            title: true,
            description: true,
            passingScore: true,
            showResults: true,
            allowReview: true,
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
      },
    })

    if (!attempt) {
      return { success: false, error: 'Resultados no encontrados' }
    }

    if (attempt.status === AttemptStatus.IN_PROGRESS) {
      return { success: false, error: 'El examen aún no ha sido enviado' }
    }

    return { success: true, attempt }
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
