'use client'

import { ExamViewer } from '@/components/exams/student'
import { saveExamAnswer, submitExamAttempt } from '@/lib/actions/exams'
import { QuestionType } from '@prisma/client'

interface ExamQuestion {
  id: string
  type: QuestionType
  question: string
  options?: string[] | null
  multipleChoiceItems?: { id: string; question: string; options: { id: string; text: string }[] }[] | null
  originalBlockType?: string | null
  blockData?: {
    url?: string
    content?: string
    title?: string
    instruction?: string
    timeLimit?: number
    aiGrading?: boolean
    maxReplays?: number
  } | null
  points: number
  minLength?: number | null
  maxLength?: number | null
  audioUrl?: string | null
}

interface ProctoringConfig {
  enabled: boolean
  requireFullscreen: boolean
  blockCopyPaste: boolean
  blockRightClick: boolean
  maxWarnings: number
}

interface SaveAnswerResult {
  success: boolean
  error?: string
  code?: string
  requiresReauth?: boolean
  answer?: unknown
  [key: string]: unknown
}

interface SubmitExamResult {
  success: boolean
  error?: string
  code?: string
  requiresReauth?: boolean
  attempt?: unknown
  [key: string]: unknown
}

interface ExamTakingClientProps {
  examId: string
  attemptId: string
  title: string
  description: string
  courseName?: string
  questions: ExamQuestion[]
  timeLimit: number
  startedAt: string
  initialAnswers: Record<string, unknown>
  proctoring: ProctoringConfig
  examType?: 'COURSE_EXAM' | 'PLACEMENT_TEST' | 'DIAGNOSTIC' | 'PRACTICE'
}

export function ExamTakingClient({
  examId,
  attemptId,
  title,
  description,
  courseName,
  questions,
  timeLimit,
  startedAt,
  initialAnswers,
  proctoring,
  examType = 'COURSE_EXAM'
}: ExamTakingClientProps) {
  const handleSaveAnswer = async (questionId: string, answer: unknown): Promise<SaveAnswerResult> => {
    return await saveExamAnswer(attemptId, questionId, answer)
  }

  const handleSubmitExam = async (): Promise<SubmitExamResult> => {
    return await submitExamAttempt(attemptId)
  }

  return (
    <ExamViewer
      examId={examId}
      attemptId={attemptId}
      title={title}
      description={description}
      courseName={courseName}
      questions={questions}
      timeLimit={timeLimit}
      startedAt={startedAt}
      initialAnswers={initialAnswers}
      onSaveAnswer={handleSaveAnswer}
      onSubmitExam={handleSubmitExam}
      proctoring={proctoring}
      examType={examType}
    />
  )
}
