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

  const { examId, attemptId } = await params
  const result = await getExamResultsForStudent(attemptId, session.user.id)

  if (!result.success || !result.attempt) {
    notFound()
  }

  // Validate that the examId in URL matches the attempt's examId
  if (result.attempt.exam.id !== examId) {
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

  // Expandir respuestas de bloques con múltiples ítems (como multiple_choice con multipleChoiceItems)
  let questionNumber = 0
  const questionResults = attempt.answers.flatMap((answer) => {
    const correctAnswer = answer.question.correctAnswer
    const options = answer.question.options as Record<string, unknown> | null
    
    // Verificar si es un bloque con múltiples ítems (multiple_choice con multipleChoiceItems)
    const multipleChoiceItems = options?.multipleChoiceItems as { 
      id: string; 
      question: string; 
      options: { id: string; text: string }[];
      correctOptionId?: string;
    }[] | undefined
    
    if (multipleChoiceItems && multipleChoiceItems.length > 0) {
      // Expandir cada ítem como un resultado individual
      const userAnswers = answer.answer as Record<string, string> | null
      
      return multipleChoiceItems.map((item) => {
        questionNumber++
        const userAnswer = userAnswers?.[item.id] || null
        const correctOptionId = item.correctOptionId
        const correctOption = item.options.find(o => o.id === correctOptionId)
        const userOption = item.options.find(o => o.id === userAnswer)
        const isItemCorrect = userAnswer === correctOptionId
        
        return {
          id: `${answer.id}-${item.id}`,
          questionNumber,
          type: answer.question.type,
          category: answer.question.tags?.[0] || undefined,
          question: item.question,
          userAnswer: userOption?.text || userAnswer,
          correctAnswer: correctOption?.text || correctOptionId || 'N/A',
          isCorrect: isItemCorrect,
          pointsEarned: isItemCorrect ? (answer.question.points / multipleChoiceItems.length) : 0,
          maxPoints: answer.question.points / multipleChoiceItems.length,
          explanation: answer.question.explanation
        }
      })
    }
    
    // Respuesta normal (no expandida)
    questionNumber++
    
    // Para preguntas tipo ESSAY, no mostrar "null" como respuesta correcta
    const isEssayType = answer.question.type === 'ESSAY'
    const displayCorrectAnswer = isEssayType 
      ? 'Requiere revisión manual del profesor'
      : (Array.isArray(correctAnswer) ? correctAnswer.join(', ') : (correctAnswer ? String(correctAnswer) : 'N/A'))
    
    // Para Essay, si está pendiente de revisión, no marcar como incorrecta
    const displayIsCorrect = isEssayType && answer.needsReview 
      ? null // Pendiente de revisión
      : (answer.isCorrect ?? false)
    
    // Formatear la respuesta del usuario para mostrar
    let displayUserAnswer: string | null = null
    if (answer.answer) {
      // Si es un objeto con audioUrl (grabación), mostrar mensaje apropiado
      if (typeof answer.answer === 'object' && (answer.answer as { audioUrl?: string }).audioUrl) {
        displayUserAnswer = '🎤 Grabación de audio enviada'
      } else if (typeof answer.answer === 'string') {
        displayUserAnswer = answer.answer
      } else {
        // Para otros objetos, intentar mostrar de forma legible
        displayUserAnswer = JSON.stringify(answer.answer)
      }
    }
    
    return [{
      id: answer.id,
      questionNumber,
      type: answer.question.type,
      category: answer.question.tags?.[0] || undefined,
      question: answer.question.question,
      userAnswer: displayUserAnswer,
      correctAnswer: displayCorrectAnswer,
      isCorrect: displayIsCorrect ?? false,
      pointsEarned: answer.pointsEarned,
      maxPoints: answer.question.points,
      explanation: answer.question.explanation,
      needsReview: answer.needsReview,
      audioUrl: typeof answer.answer === 'object' ? (answer.answer as { audioUrl?: string }).audioUrl : undefined
    }]
  })

  const correctAnswersCount = questionResults.filter(r => r.isCorrect).length
  const totalQuestionsCount = questionResults.length
  
  // Calcular el score basado en respuestas correctas si el score guardado es 0 o null
  // Esto ocurre cuando hay preguntas pendientes de revisión
  const calculatedScore = totalQuestionsCount > 0 
    ? Math.round((correctAnswersCount / totalQuestionsCount) * 100) 
    : 0
  const displayScore = (attempt.score ?? 0) > 0 ? attempt.score! : calculatedScore
  
  // Determinar si aprobó basado en el score calculado o si tiene preguntas pendientes de revisión
  const hasPendingReview = questionResults.some(r => 'needsReview' in r && r.needsReview)
  const passed: boolean | 'pending' = hasPendingReview ? 'pending' : displayScore >= exam.passingScore

  return (
    <ExamResults
      examTitle={exam.title}
      examDescription={exam.description}
      score={displayScore}
      totalPoints={attempt.totalPoints ?? 0}
      maxPoints={attempt.maxPoints ?? 0}
      correctAnswers={correctAnswersCount}
      totalQuestions={questionResults.length}
      timeSpent={attempt.timeSpent ?? 0}
      passed={passed}
      xpEarned={passed ? 350 : 100}
      questionResults={questionResults}
      dashboardUrl="/dashboard"
    />
  )
}
