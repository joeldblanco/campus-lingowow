import { auth } from '@/auth'
import { redirect, notFound } from 'next/navigation'
import { getExamAttemptWithAnswers, getAttemptsForGrading } from '@/lib/actions/exams'
import { GradingClient } from './grading-client'

interface PageProps {
  params: Promise<{ examId: string; attemptId: string }>
}

export default async function GradingPage({ params }: PageProps) {
  const session = await auth()
  
  if (!session?.user?.id) {
    redirect('/auth/login')
  }

  const userRoles = session.user.roles || []
  if (!userRoles.includes('TEACHER') && !userRoles.includes('ADMIN')) {
    redirect('/not-authorized')
  }

  const { examId, attemptId } = await params
  
  const [attemptResult, attemptsResult] = await Promise.all([
    getExamAttemptWithAnswers(attemptId),
    getAttemptsForGrading(examId)
  ])

  if (!attemptResult.success || !attemptResult.attempt) {
    notFound()
  }

  const { attempt } = attemptResult
  const allAttempts = attemptsResult.success ? attemptsResult.attempts || [] : []

  const students = allAttempts.map(a => ({
    id: a.userId,
    name: `${a.user.name || ''} ${a.user.lastName || ''}`.trim() || a.user.email,
    email: a.user.email,
    score: a.score ?? 0
  }))

  const answers = attempt.answers.map((answer, index) => ({
    id: answer.id,
    questionId: answer.questionId,
    questionNumber: index + 1,
    questionType: answer.question.type,
    questionText: answer.question.question,
    category: answer.question.tags?.[0],
    maxPoints: answer.question.points,
    userAnswer: answer.answer ? String(answer.answer) : null,
    correctAnswer: Array.isArray(answer.question.correctAnswer) 
      ? (answer.question.correctAnswer as string[]).join(', ') 
      : String(answer.question.correctAnswer),
    isCorrect: answer.isCorrect,
    pointsEarned: answer.pointsEarned,
    needsReview: answer.needsReview,
    feedback: answer.feedback,
    isAutoGraded: !answer.needsReview && answer.reviewedBy !== session.user.id
  }))

  const totalScore = attempt.totalPoints ?? 0
  const maxScore = attempt.maxPoints ?? answers.reduce((sum, a) => sum + a.maxPoints, 0)

  const submittedAt = attempt.submittedAt 
    ? new Date(attempt.submittedAt).toLocaleString('es-ES', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : 'N/A'

  return (
    <GradingClient
      examId={examId}
      examTitle={attempt.exam.title}
      courseName={attempt.exam.course?.title || ''}
      students={students}
      selectedStudentId={attempt.userId}
      attempt={{
        id: attempt.id,
        attemptNumber: attempt.attemptNumber,
        submittedAt,
        status: attempt.status as 'PENDING_REVIEW' | 'COMPLETED' | 'IN_PROGRESS'
      }}
      totalScore={totalScore}
      maxScore={maxScore}
      answers={answers}
      userId={session.user.id}
    />
  )
}
