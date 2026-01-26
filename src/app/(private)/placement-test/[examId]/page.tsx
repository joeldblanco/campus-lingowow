'use server'

import { auth } from '@/auth'
import { redirect, notFound } from 'next/navigation'
import { getExamById, canUserTakePlacementTest, startExamAttempt, getExamAttemptWithAnswers } from '@/lib/actions/exams'
import { ExamTakingClient } from '@/app/(private)/exams/[examId]/take/exam-taking-client'
import { JsonValue } from '@prisma/client/runtime/library'

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

  // Parsear opciones de preguntas para compatibilidad con ExamViewer
  const parseQuestionOptions = (options: JsonValue | null | undefined) => {
    if (!options) return null
    if (Array.isArray(options)) return options as string[]
    if (typeof options === 'string') {
      try {
        const parsed = JSON.parse(options)
        return Array.isArray(parsed) ? parsed : null
      } catch {
        return null
      }
    }
    return null
  }

  const questions = exam.questions.map(q => ({
    ...q,
    options: parseQuestionOptions(q.options)
  }))

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
