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

  const sections = result.exam.sections.map(section => ({
    id: section.id,
    title: section.title,
    description: section.description,
    questions: section.questions.map(q => ({
      id: q.id,
      type: q.type,
      question: q.question,
      options: q.options as string[] | null,
      points: q.points,
      minLength: q.minLength,
      maxLength: q.maxLength,
      audioUrl: q.audioUrl
    }))
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

  return (
    <ExamTakingClient
      examId={examId}
      attemptId={result.attempt.id}
      title={result.exam.title}
      description={result.exam.description}
      courseName={courseName}
      sections={sections}
      timeLimit={result.exam.timeLimit || 60}
      initialAnswers={initialAnswers}
      proctoring={proctoring}
    />
  )
}
