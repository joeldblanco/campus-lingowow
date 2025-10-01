'use server'

import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { 
  CreateExamSchema, 
  EditExamSchema, 
  AssignExamSchema
} from '@/schemas/exams'
import * as z from 'zod'
import { AttemptStatus, AssignmentStatus } from '@prisma/client'
import type {
  ExamWithDetails,
  ExamStats,
  ExamCreateResponse,
  ExamUpdateResponse,
  ExamDeleteResponse,
  ExamAssignResponse
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
            email: true
          }
        },
        course: {
          select: {
            id: true,
            title: true,
            language: true,
            level: true
          }
        },
        module: {
          select: {
            id: true,
            title: true,
            level: true
          }
        },
        lesson: {
          select: {
            id: true,
            title: true
          }
        },
        sections: {
          include: {
            questions: {
              orderBy: { order: 'asc' }
            }
          },
          orderBy: { order: 'asc' }
        },
        attempts: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                lastName: true,
                email: true
              }
            }
          }
        },
        _count: {
          select: {
            attempts: true,
            assignments: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return exams.map(exam => ({
      ...exam,
      sections: exam.sections.map(section => ({
        ...section,
        questions: section.questions.map(question => ({
          ...question,
          options: question.options as string[] | null,
          correctAnswer: question.correctAnswer as string | string[]
        }))
      })),
      attempts: exam.attempts
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
            email: true
          }
        },
        course: {
          select: {
            id: true,
            title: true,
            language: true,
            level: true
          }
        },
        module: {
          select: {
            id: true,
            title: true,
            level: true
          }
        },
        lesson: {
          select: {
            id: true,
            title: true
          }
        },
        sections: {
          include: {
            questions: {
              orderBy: { order: 'asc' }
            }
          },
          orderBy: { order: 'asc' }
        },
        attempts: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                lastName: true,
                email: true
              }
            }
          }
        },
        _count: {
          select: {
            attempts: true,
            assignments: true
          }
        }
      }
    })

    if (!exam) return null

    return {
      ...exam,
      sections: exam.sections.map(section => ({
        ...section,
        questions: section.questions.map(question => ({
          ...question,
          options: question.options as string[] | null,
          correctAnswer: question.correctAnswer as string | string[]
        }))
      })),
      attempts: exam.attempts
    }
  } catch (error) {
    console.error('Error fetching exam:', error)
    throw new Error('Failed to fetch exam')
  }
}

export async function createExam(data: z.infer<typeof CreateExamSchema>): Promise<ExamCreateResponse> {
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
          shuffleQuestions: validatedData.shuffleQuestions,
          shuffleOptions: validatedData.shuffleOptions,
          showResults: validatedData.showResults,
          allowReview: validatedData.allowReview,
          createdById: validatedData.createdById,
          courseId: validatedData.courseId || null,
          moduleId: validatedData.moduleId || null,
          lessonId: validatedData.lessonId || null,
        }
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
            points: sectionData.questions.reduce((sum, q) => sum + q.points, 0)
          }
        })

        // Crear las preguntas de cada sección
        for (const questionData of sectionData.questions) {
          await tx.examQuestion.create({
            data: {
              sectionId: section.id,
              type: questionData.type,
              question: questionData.question,
              options: questionData.options,
              correctAnswer: questionData.correctAnswer,
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
              audioPausable: questionData.audioPausable || false
            }
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

export async function updateExam(id: string, data: z.infer<typeof EditExamSchema>): Promise<ExamUpdateResponse> {
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
          courseId: validatedData.courseId || undefined,
          moduleId: validatedData.moduleId || undefined,
          lessonId: validatedData.lessonId || undefined,
        }
      })

      // Si se proporcionan secciones, actualizar completamente
      if (validatedData.sections) {
        // Eliminar secciones existentes (cascade eliminará preguntas)
        await tx.examSection.deleteMany({
          where: { examId: id }
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
              points: sectionData.questions.reduce((sum, q) => sum + q.points, 0)
            }
          })

          // Crear preguntas de la sección
          for (const questionData of sectionData.questions) {
            await tx.examQuestion.create({
              data: {
                sectionId: section.id,
                type: questionData.type,
                question: questionData.question,
                options: questionData.options,
                correctAnswer: questionData.correctAnswer,
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
                audioPausable: questionData.audioPausable || false
              }
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
      where: { examId: id }
    })

    if (attemptCount > 0) {
      return { success: false, error: 'No se puede eliminar un examen con intentos de estudiantes' }
    }

    await db.exam.delete({
      where: { id }
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
        where: { isPublished: true }
      }),
      db.examAttempt.count(),
      db.examAttempt.count({
        where: {
          status: AttemptStatus.COMPLETED,
          score: { gte: 70 } // Asumiendo 70% como aprobatorio
        }
      })
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
              }
            }
          }
        }
      },
      orderBy: { title: 'asc' }
    })

    return courses
  } catch (error) {
    console.error('Error fetching courses for exams:', error)
    throw new Error('Error al obtener cursos para exámenes')
  }
}

export async function assignExamToStudents(data: z.infer<typeof AssignExamSchema>): Promise<ExamAssignResponse> {
  try {
    const validatedData = AssignExamSchema.parse(data)

    const assignments = await Promise.all(
      validatedData.studentIds.map(studentId =>
        db.examAssignment.upsert({
          where: {
            examId_userId: {
              examId: validatedData.examId,
              userId: studentId,
            }
          },
          update: {
            dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : null,
            instructions: validatedData.instructions,
            status: AssignmentStatus.ASSIGNED,
          },
          create: {
            examId: validatedData.examId,
            userId: studentId,
            assignedBy: 'current-user-id', // TODO: Obtener del contexto de sesión
            dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : null,
            instructions: validatedData.instructions,
            status: AssignmentStatus.ASSIGNED,
          }
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
