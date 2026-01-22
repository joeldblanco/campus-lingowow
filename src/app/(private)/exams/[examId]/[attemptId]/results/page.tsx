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

  // Tipos de bloques informativos
  const INFORMATIVE_BLOCK_TYPES = ['title', 'text', 'audio', 'video', 'image']

  // Tipo para las preguntas del examen
  type ExamQuestion = {
    id: string
    type: string
    question: string
    options: unknown
    correctAnswer: unknown
    explanation: string | null
    points: number
    tags: string[]
    order: number
    sectionTitle: string
  }

  // Obtener todas las preguntas del examen ordenadas por sección y orden
  const allExamQuestions: ExamQuestion[] = exam.sections
    .sort((a: { order: number }, b: { order: number }) => a.order - b.order)
    .flatMap((section: { title: string; questions: Array<{ id: string; type: string; question: string; options: unknown; correctAnswer: unknown; explanation: string | null; points: number; tags: string[]; order: number }> }) => 
      section.questions
        .sort((a: { order: number }, b: { order: number }) => a.order - b.order)
        .map((q: { id: string; type: string; question: string; options: unknown; correctAnswer: unknown; explanation: string | null; points: number; tags: string[]; order: number }) => ({ ...q, sectionTitle: section.title }))
    )

  // Crear mapa de respuestas por questionId
  const answersMap = new Map(attempt.answers.map(a => [a.questionId, a]))

  // Generar resultados en el orden del examen, incluyendo bloques informativos
  let questionNumber = 0
  const questionResults = allExamQuestions.flatMap((question) => {
    const options = question.options as Record<string, unknown> | null
    const originalBlockType = options?.originalBlockType as string | null
    const isInformative = originalBlockType && INFORMATIVE_BLOCK_TYPES.includes(originalBlockType)
    
    // Para bloques informativos, retornar estructura especial
    if (isInformative) {
      return [{
        id: `informative-${question.id}`,
        questionNumber: 0,
        type: originalBlockType,
        category: undefined,
        question: question.question,
        userAnswer: null,
        correctAnswer: '',
        isCorrect: true,
        pointsEarned: 0,
        maxPoints: 0,
        explanation: null,
        needsReview: false,
        audioUrl: undefined,
        isInformativeBlock: true,
        informativeContent: {
          type: originalBlockType,
          audioUrl: (options?.audioUrl || options?.url) as string | undefined,
          videoUrl: (options?.videoUrl || (originalBlockType === 'video' ? options?.url : undefined)) as string | undefined,
          imageUrl: (options?.imageUrl || (originalBlockType === 'image' ? options?.url : undefined)) as string | undefined,
          text: (options?.text || options?.content) as string | undefined,
          title: options?.title as string | undefined,
        }
      }]
    }
    
    const answer = answersMap.get(question.id)
    const correctAnswer = question.correctAnswer
    
    // Verificar si es un bloque con múltiples ítems (multiple_choice con multipleChoiceItems)
    const multipleChoiceItems = options?.multipleChoiceItems as { 
      id: string; 
      question: string; 
      options: { id: string; text: string }[];
      correctOptionId?: string;
    }[] | undefined
    
    if (multipleChoiceItems && multipleChoiceItems.length > 0 && answer) {
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
          type: question.type,
          category: question.tags?.[0] || undefined,
          question: item.question,
          userAnswer: userOption?.text || (userAnswer ? '(Opción no encontrada)' : null),
          correctAnswer: correctOption?.text || '(Opción no encontrada)',
          isCorrect: isItemCorrect,
          pointsEarned: isItemCorrect ? (question.points / multipleChoiceItems.length) : 0,
          maxPoints: question.points / multipleChoiceItems.length,
          explanation: question.explanation,
          needsReview: false,
          isInformativeBlock: false
        }
      })
    }
    
    // Respuesta normal (no expandida)
    questionNumber++
    
    // Para preguntas tipo ESSAY, no mostrar "null" como respuesta correcta
    const isEssayType = question.type === 'ESSAY'
    
    // Función para mapear IDs de opciones a texto
    const mapOptionIdsToText = (ids: string[]): string => {
      // Para multi_select, buscar en correctOptions e incorrectOptions
      const correctOptions = options?.correctOptions as { id: string; text: string }[] | undefined
      const incorrectOptions = options?.incorrectOptions as { id: string; text: string }[] | undefined
      const allOptions = [...(correctOptions || []), ...(incorrectOptions || [])]
      
      if (allOptions.length > 0) {
        return ids.map(id => {
          const option = allOptions.find(o => o.id === id)
          return option?.text || id
        }).join(', ')
      }
      
      // Fallback: devolver los IDs tal cual si no hay opciones
      return ids.join(', ')
    }
    
    const displayCorrectAnswer = isEssayType 
      ? 'Requiere revisión manual del profesor'
      : (Array.isArray(correctAnswer) ? mapOptionIdsToText(correctAnswer as string[]) : (correctAnswer ? String(correctAnswer) : 'N/A'))
    
    // Para Essay, si está pendiente de revisión, no marcar como incorrecta
    const displayIsCorrect = isEssayType && answer?.needsReview 
      ? null // Pendiente de revisión
      : (answer?.isCorrect ?? false)
    
    // Formatear la respuesta del usuario para mostrar
    let displayUserAnswer: string | null = null
    if (answer?.answer) {
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
      id: answer?.id || `no-answer-${question.id}`,
      questionNumber,
      type: question.type,
      category: question.tags?.[0] || undefined,
      question: question.question,
      userAnswer: displayUserAnswer,
      correctAnswer: displayCorrectAnswer,
      isCorrect: displayIsCorrect ?? false,
      pointsEarned: answer?.pointsEarned ?? 0,
      maxPoints: question.points,
      explanation: question.explanation,
      needsReview: answer?.needsReview ?? isEssayType,
      audioUrl: typeof answer?.answer === 'object' ? (answer.answer as { audioUrl?: string }).audioUrl : undefined,
      isInformativeBlock: false
    }]
  })

  // Filtrar solo preguntas respondibles (no informativas) para estadísticas
  const answerableResults = questionResults.filter(r => !r.isInformativeBlock)
  const correctAnswersCount = answerableResults.filter(r => r.isCorrect && !r.needsReview).length
  const totalAnswerableCount = answerableResults.length
  
  // Siempre calcular el score basado en respuestas correctas
  // No usar attempt.score porque puede estar desactualizado si la auto-calificación falló
  const displayScore = totalAnswerableCount > 0 
    ? Math.round((correctAnswersCount / totalAnswerableCount) * 100) 
    : 0
  
  // Determinar si aprobó basado en el score calculado o si tiene preguntas pendientes de revisión
  const hasPendingReview = answerableResults.some(r => r.needsReview)
  const passed: boolean | 'pending' = hasPendingReview ? 'pending' : displayScore >= exam.passingScore

  return (
    <ExamResults
      examTitle={exam.title}
      examDescription={exam.description}
      score={displayScore}
      passingScore={exam.passingScore}
      totalPoints={attempt.totalPoints ?? 0}
      maxPoints={attempt.maxPoints ?? 0}
      correctAnswers={correctAnswersCount}
      totalQuestions={totalAnswerableCount}
      timeSpent={attempt.timeSpent ?? 0}
      passed={passed}
      hasPendingReview={hasPendingReview}
      xpEarned={passed ? 350 : 100}
      questionResults={questionResults}
      dashboardUrl="/dashboard"
    />
  )
}
