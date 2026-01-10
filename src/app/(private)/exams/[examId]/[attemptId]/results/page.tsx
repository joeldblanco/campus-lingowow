import { auth } from '@/auth'
import { redirect, notFound } from 'next/navigation'
import { getExamResultsForStudent } from '@/lib/actions/exams'
import { ExamResults } from '@/components/exams/student'

interface PageProps {
  params: Promise<{ examId: string; attemptId: string }>
}

export default async function ExamResultsPage({ params }: PageProps) {
  const session = await auth()
  
  if (!session?.user?.id) {
    redirect('/auth/login')
  }

  const { attemptId } = await params
  const result = await getExamResultsForStudent(attemptId, session.user.id)

  if (!result.success || !result.attempt) {
    notFound()
  }

  const { attempt } = result
  const exam = attempt.exam

  if (!exam.showResults) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center p-8 max-w-md">
          <h1 className="text-2xl font-bold mb-4">Examen Enviado</h1>
          <p className="text-muted-foreground mb-6">
            Tu examen ha sido enviado correctamente. Los resultados estarán disponibles una vez que el profesor lo revise.
          </p>
          <a href="/dashboard" className="text-primary hover:underline">
            Volver al Dashboard
          </a>
        </div>
      </div>
    )
  }

  const questionResults = attempt.answers.map((answer, index) => {
    const correctAnswer = answer.question.correctAnswer
    return {
      id: answer.id,
      questionNumber: index + 1,
      type: answer.question.type,
      category: answer.question.tags?.[0] || undefined,
      question: answer.question.question,
      userAnswer: answer.answer ? String(answer.answer) : null,
      correctAnswer: Array.isArray(correctAnswer) ? correctAnswer.join(', ') : String(correctAnswer),
      isCorrect: answer.isCorrect ?? false,
      pointsEarned: answer.pointsEarned,
      maxPoints: answer.question.points,
      explanation: answer.question.explanation
    }
  })

  const correctAnswers = questionResults.filter(r => r.isCorrect).length
  const passed = (attempt.score ?? 0) >= exam.passingScore

  return (
    <ExamResults
      examTitle={exam.title}
      examDescription={exam.description}
      score={attempt.score ?? 0}
      totalPoints={attempt.totalPoints ?? 0}
      maxPoints={attempt.maxPoints ?? 0}
      correctAnswers={correctAnswers}
      totalQuestions={questionResults.length}
      timeSpent={attempt.timeSpent ?? 0}
      passed={passed}
      xpEarned={passed ? 350 : 100}
      questionResults={questionResults}
      dashboardUrl="/dashboard"
    />
  )
}
