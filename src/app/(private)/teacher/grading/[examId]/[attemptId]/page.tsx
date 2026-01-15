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

  // Crear un mapa de respuestas por questionId para acceso rápido
  const answersMap = new Map(attempt.answers.map(a => [a.questionId, a]))

  // Obtener TODAS las preguntas del examen (no solo las respondidas)
  const allQuestions = attempt.exam.sections.flatMap(section => 
    section.questions.map(q => {
      // Extraer groupId de las opciones
      let groupId: string | null = null
      if (q.options && typeof q.options === 'object' && !Array.isArray(q.options)) {
        groupId = (q.options as Record<string, unknown>).groupId as string || null
      } else if (typeof q.options === 'string') {
        try {
          const parsed = JSON.parse(q.options)
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            groupId = parsed.groupId || null
          }
        } catch {
          // Ignorar errores de parsing
        }
      }
      return { ...q, sectionTitle: section.title, groupId }
    })
  )

  // Mapear todas las preguntas, incluyendo las no respondidas
  let questionNumber = 0
  const answers = allQuestions.map((question) => {
    questionNumber++
    const answer = answersMap.get(question.id)
    
    return {
      id: answer?.id || `no-answer-${question.id}`,
      questionId: question.id,
      questionNumber,
      questionType: question.type,
      questionText: question.question,
      category: question.tags?.[0],
      maxPoints: question.points,
      userAnswer: answer?.answer ? String(answer.answer) : null,
      correctAnswer: Array.isArray(question.correctAnswer) 
        ? (question.correctAnswer as string[]).join(', ') 
        : String(question.correctAnswer),
      isCorrect: answer?.isCorrect ?? null,
      pointsEarned: answer?.pointsEarned ?? 0,
      needsReview: answer?.needsReview ?? (question.type === 'ESSAY'),
      feedback: answer?.feedback ?? null,
      isAutoGraded: answer ? (!answer.needsReview && answer.reviewedBy !== session.user.id) : false,
      groupId: question.groupId,
      sectionTitle: question.sectionTitle,
    }
  })

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
