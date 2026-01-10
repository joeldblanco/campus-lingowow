'use client'

import { ExamViewer } from '@/components/exams/student'
import { saveExamAnswer, submitExamAttempt } from '@/lib/actions/exams'
import { QuestionType } from '@prisma/client'

interface ExamSection {
  id: string
  title: string
  description?: string | null
  questions: {
    id: string
    type: QuestionType
    question: string
    options?: string[] | null
    points: number
    minLength?: number | null
    maxLength?: number | null
    audioUrl?: string | null
  }[]
}

interface ExamTakingClientProps {
  examId: string
  attemptId: string
  title: string
  description: string
  courseName?: string
  sections: ExamSection[]
  timeLimit: number
  initialAnswers: Record<string, unknown>
}

export function ExamTakingClient({
  examId,
  attemptId,
  title,
  description,
  courseName,
  sections,
  timeLimit,
  initialAnswers
}: ExamTakingClientProps) {
  const handleSaveAnswer = async (questionId: string, answer: unknown) => {
    await saveExamAnswer(attemptId, questionId, answer)
  }

  const handleSubmitExam = async () => {
    await submitExamAttempt(attemptId)
  }

  return (
    <ExamViewer
      examId={examId}
      attemptId={attemptId}
      title={title}
      description={description}
      courseName={courseName}
      sections={sections}
      timeLimit={timeLimit}
      initialAnswers={initialAnswers}
      onSaveAnswer={handleSaveAnswer}
      onSubmitExam={handleSubmitExam}
    />
  )
}
