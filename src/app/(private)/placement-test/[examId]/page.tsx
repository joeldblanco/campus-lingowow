'use server'

import { auth } from '@/auth'
import { redirect, notFound } from 'next/navigation'
import { getExamById, canUserTakePlacementTest, startExamAttempt, getExamAttemptWithAnswers } from '@/lib/actions/exams'
import { ExamTakingClient } from '@/app/(private)/exams/[examId]/take/exam-taking-client'

interface PlacementTestTakePageProps {
  params: Promise<{ examId: string }>
}

export default async function PlacementTestTakePage({ params }: PlacementTestTakePageProps) {
  const { examId } = await params
  const session = await auth()
  
  if (!session?.user?.id) {
    redirect('/auth/signin')
  }

  const exam = await getExamById(examId)
  
  if (!exam) {
    notFound()
  }

  if (exam.examType !== 'PLACEMENT_TEST') {
    redirect('/placement-test')
  }

  const eligibility = await canUserTakePlacementTest(examId, session.user.id)
  
  if (!eligibility.canTake) {
    redirect(`/placement-test/${examId}/results`)
  }

  const attemptResult = await startExamAttempt(examId, session.user.id)
  
  if (!attemptResult.success || !attemptResult.attempt) {
    redirect('/placement-test')
  }

  let initialAnswers: Record<string, unknown> = {}
  
  if (attemptResult.isResuming) {
    const attemptData = await getExamAttemptWithAnswers(attemptResult.attempt.id)
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

  // Parsear opciones de preguntas para compatibilidad con ExamViewer
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

  const questions = exam.questions.map(q => {
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

  return (
    <ExamTakingClient
      examId={exam.id}
      attemptId={attemptResult.attempt.id}
      title={exam.title}
      description={exam.description || ''}
      questions={questions}
      timeLimit={exam.timeLimit || 60}
      startedAt={attemptResult.attempt.startedAt.toISOString()}
      initialAnswers={initialAnswers}
      proctoring={{
        enabled: false,
        requireFullscreen: false,
        blockCopyPaste: false,
        blockRightClick: false,
        maxWarnings: 0
      }}
      examType="PLACEMENT_TEST"
    />
  )
}
