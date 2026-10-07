'use server'

import { auth } from '@/auth'
import { db } from '@/lib/db'
import { startExamAttempt, getExamAttemptWithState, canUserTakePlacementTest } from '@/lib/actions/exams'
import type { ExamTakingClientProps } from '@/app/(private)/exams/[examId]/take/exam-taking-client'

type EntryRedirect = { redirectUrl: string }
type EntryDetails = { title: string; proctoring: ExamTakingClientProps['proctoring']; isPlacement: boolean }

export async function getExamEntryDetails(examId: string): Promise<EntryDetails | EntryRedirect> {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Inicia sesión para entrar a la evaluación.')
  const exam = await db.exam.findUnique({ where: { id: examId }, select: {
    title: true, isPublished: true, blockCopyPaste: true, blockRightClick: true, maxWarnings: true, examType: true,
    courseId: true, course: { select: { isPersonalized: true } },
    assignments: { where: { userId: session.user.id }, select: { id: true } },
  } })
  if (!exam?.isPublished) throw new Error('Esta evaluación no está disponible.')
  if (exam.examType === 'PLACEMENT_TEST') {
    const eligibility = await canUserTakePlacementTest(examId, session.user.id)
    if (!eligibility.canTake) return { redirectUrl: `/placement-test/${examId}/results` }
  } else if (exam.courseId && exam.course) {
    const hasAccess = exam.course.isPersonalized ? exam.assignments.length > 0 : Boolean(await db.enrollment.findFirst({
      where: { studentId: session.user.id, courseId: exam.courseId, status: { not: 'CANCELLED' } }, select: { id: true },
    }))
    if (!hasAccess) throw new Error('No tienes acceso a esta evaluación.')
  }
  return { title: exam.title, proctoring: { enabled: true, requireFullscreen: true, blockCopyPaste: exam.blockCopyPaste, blockRightClick: exam.blockRightClick, maxWarnings: exam.maxWarnings || 5 }, isPlacement: exam.examType === 'PLACEMENT_TEST' }
}

export async function loadExamTakingSession(examId: string): Promise<ExamTakingClientProps | EntryRedirect> {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Inicia sesión para entrar a la evaluación.')
  const details = await getExamEntryDetails(examId)
  if ('redirectUrl' in details) return details
  const result = await startExamAttempt(examId, session.user.id)
  if (!result.success || !result.attempt || !result.exam) {
    if (result.error === 'Has alcanzado el número máximo de intentos') return { redirectUrl: `/exams/${examId}?error=max-attempts` }
    throw new Error(result.error || 'No se pudo iniciar la evaluación.')
  }
  let initialAnswers: Record<string, unknown> = {}
  let initialQuestionIndex = 0
  let initialFlaggedQuestions: string[] = []

  if (result.isResuming) {
    const attemptData = await getExamAttemptWithState(result.attempt.id)
    if (attemptData.success && attemptData.attempt) {
      initialAnswers = attemptData.attempt.answers.reduce((acc, answer) => {
        acc[answer.questionId] = answer.answer
        return acc
      }, {} as Record<string, unknown>)

      // Recuperar estado de navegación y flags
      initialQuestionIndex = attemptData.attempt.currentQuestionIndex ?? 0
      initialFlaggedQuestions = attemptData.attempt.flaggedQuestions ?? []
    }
  }

  // Tipo para los datos parseados de opciones
  type ParsedOptions = {
    options: string[] | null
    multipleChoiceItems: { id: string; question: string; options: { id: string; text: string }[] }[] | null
    trueFalseItems: { id: string; statement: string; correctAnswer: boolean }[] | null
    originalBlockType: string | null
    blockData: {
      url?: string
      content?: string
      title?: string
      instruction?: string
      timeLimit?: number
      aiGrading?: boolean
      maxReplays?: number
    } | null
    groupId: string | null
  }

  // Función para parsear opciones que pueden venir como JSON string, array u objeto
  const parseQuestionOptions = (options: unknown): ParsedOptions => {
    const defaultResult: ParsedOptions = { options: null, multipleChoiceItems: null, trueFalseItems: null, originalBlockType: null, blockData: null, groupId: null }

    if (!options) return defaultResult

    // Si es un array de strings, son opciones simples
    if (Array.isArray(options)) {
      return { ...defaultResult, options: options as string[] }
    }

    // Función auxiliar para procesar objeto
    const processObject = (obj: Record<string, unknown>): ParsedOptions => {
      // Extraer groupId si existe
      const groupId = obj.groupId as string | null || null
      // Verdadero/Falso de varias sentencias se guarda sin originalBlockType
      const trueFalseItems = obj.trueFalseItems as ParsedOptions['trueFalseItems'] || null

      // Si tiene originalBlockType, es un bloque con metadata
      if (obj.originalBlockType) {
        return {
          options: null,
          // Incluir multipleChoiceItems si existen (para bloques multiple_choice)
          multipleChoiceItems: obj.multipleChoiceItems as ParsedOptions['multipleChoiceItems'] || null,
          trueFalseItems,
          originalBlockType: obj.originalBlockType as string,
          blockData: {
            url: obj.url as string | undefined,
            content: obj.content as string | undefined,
            title: obj.title as string | undefined,
            instruction: obj.instruction as string | undefined,
            timeLimit: obj.timeLimit as number | undefined,
            aiGrading: obj.aiGrading as boolean | undefined,
            maxReplays: obj.maxReplays as number | undefined,
          },
          groupId,
        }
      }
      // Si tiene multipleChoiceItems sin originalBlockType
      if (obj.multipleChoiceItems) {
        return {
          ...defaultResult,
          multipleChoiceItems: obj.multipleChoiceItems as ParsedOptions['multipleChoiceItems'],
          trueFalseItems,
          groupId,
        }
      }
      // Retornar con groupId (y trueFalseItems si existen)
      return { ...defaultResult, trueFalseItems, groupId }
    }

    // Si es un string, intentar parsear como JSON
    if (typeof options === 'string') {
      try {
        const parsed = JSON.parse(options)
        if (Array.isArray(parsed)) {
          return { ...defaultResult, options: parsed }
        }
        if (typeof parsed === 'object' && parsed !== null) {
          return processObject(parsed)
        }
      } catch {
        return defaultResult
      }
    }

    // Si es un objeto
    if (typeof options === 'object' && options !== null) {
      return processObject(options as Record<string, unknown>)
    }

    return defaultResult
  }

  const questions = result.exam.questions.map(q => {
    const parsed = parseQuestionOptions(q.options)
    return {
      id: q.id,
      type: q.type,
      question: q.question,
      options: parsed.options,
      multipleChoiceItems: parsed.multipleChoiceItems,
      trueFalseItems: parsed.trueFalseItems,
      originalBlockType: parsed.originalBlockType,
      blockData: parsed.blockData,
      points: q.points,
      minLength: q.minLength,
      maxLength: q.maxLength,
      audioUrl: q.audioUrl,
      groupId: parsed.groupId
    }
  })

  const proctoring = {
    enabled: true,
    requireFullscreen: true,
    blockCopyPaste: result.exam.blockCopyPaste,
    blockRightClick: result.exam.blockRightClick,
    maxWarnings: result.exam.maxWarnings || 5
  }

  let courseName: string | undefined
  if (result.exam.courseId) {
    const course = await db.course.findUnique({
      where: { id: result.exam.courseId },
      select: { title: true }
    })
    courseName = course?.title
  }

  const timeLimit = result.exam.timeLimit || 60

  return {
    examId, attemptId: result.attempt.id, title: result.exam.title,
    description: result.exam.description || '', courseName, questions, timeLimit,
    startedAt: result.attempt.startedAt.toISOString(), initialAnswers,
    initialQuestionIndex, initialFlaggedQuestions, isResuming: Boolean(result.isResuming),
    proctoring, examType: result.exam.examType,
  }
}
