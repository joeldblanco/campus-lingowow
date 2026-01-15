import { auth } from '@/auth'
import { redirect, notFound } from 'next/navigation'
import { startExamAttempt, getExamAttemptWithAnswers } from '@/lib/actions/exams'
import { db } from '@/lib/db'
import { ExamTakingClient } from './exam-taking-client'

interface PageProps {
  params: Promise<{ examId: string }>
}

export default async function TakeExamPage({ params }: PageProps) {
  const session = await auth()
  
  if (!session?.user?.id) {
    redirect('/auth/login')
  }

  const { examId } = await params
  const result = await startExamAttempt(examId, session.user.id)

  if (!result.success || !result.attempt || !result.exam) {
    if (result.error === 'Has alcanzado el número máximo de intentos') {
      redirect(`/exams/${examId}?error=max-attempts`)
    }
    notFound()
  }

  let initialAnswers: Record<string, unknown> = {}
  
  if (result.isResuming) {
    const attemptData = await getExamAttemptWithAnswers(result.attempt.id)
    if (attemptData.success && attemptData.attempt) {
      initialAnswers = attemptData.attempt.answers.reduce((acc, answer) => {
        acc[answer.questionId] = answer.answer
        return acc
      }, {} as Record<string, unknown>)
    }
  }

  // Tipo para los datos parseados de opciones
  type ParsedOptions = {
    options: string[] | null
    multipleChoiceItems: { id: string; question: string; options: { id: string; text: string }[] }[] | null
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
    const defaultResult: ParsedOptions = { options: null, multipleChoiceItems: null, originalBlockType: null, blockData: null, groupId: null }
    
    if (!options) return defaultResult
    
    // Si es un array de strings, son opciones simples
    if (Array.isArray(options)) {
      return { ...defaultResult, options: options as string[] }
    }
    
    // Función auxiliar para procesar objeto
    const processObject = (obj: Record<string, unknown>): ParsedOptions => {
      // Extraer groupId si existe
      const groupId = obj.groupId as string | null || null
      
      // Si tiene originalBlockType, es un bloque con metadata
      if (obj.originalBlockType) {
        return {
          options: null,
          // Incluir multipleChoiceItems si existen (para bloques multiple_choice)
          multipleChoiceItems: obj.multipleChoiceItems as ParsedOptions['multipleChoiceItems'] || null,
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
          groupId,
        }
      }
      // Retornar con groupId si existe
      return { ...defaultResult, groupId }
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

  const sections = result.exam.sections.map(section => ({
    id: section.id,
    title: section.title,
    description: section.description,
    questions: section.questions.map(q => {
      const parsed = parseQuestionOptions(q.options)
      return {
        id: q.id,
        type: q.type,
        question: q.question,
        options: parsed.options,
        multipleChoiceItems: parsed.multipleChoiceItems,
        originalBlockType: parsed.originalBlockType,
        blockData: parsed.blockData,
        points: q.points,
        minLength: q.minLength,
        maxLength: q.maxLength,
        audioUrl: q.audioUrl,
        groupId: parsed.groupId
      }
    })
  }))

  const proctoring = {
    enabled: result.exam.proctoringEnabled,
    requireFullscreen: result.exam.requireFullscreen,
    blockCopyPaste: result.exam.blockCopyPaste,
    blockRightClick: result.exam.blockRightClick,
    maxWarnings: result.exam.maxWarnings
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

  return (
    <ExamTakingClient
      examId={examId}
      attemptId={result.attempt.id}
      title={result.exam.title}
      description={result.exam.description}
      courseName={courseName}
      sections={sections}
      timeLimit={timeLimit}
      startedAt={result.attempt.startedAt.toISOString()}
      initialAnswers={initialAnswers}
      proctoring={proctoring}
    />
  )
}
