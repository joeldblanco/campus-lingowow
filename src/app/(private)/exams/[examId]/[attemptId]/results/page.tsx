import { auth } from '@/auth'
import { redirect, notFound } from 'next/navigation'
import { getExamResultsForStudent } from '@/lib/actions/exams'
import { ExamResults } from '@/components/exams/student'
import { normalizeTrueFalseAnswer } from '@/lib/utils/true-false-grading'

interface PageProps {
  params: Promise<{ examId: string; attemptId: string }>
}

export default async function ExamResultsPage({ params }: PageProps) {
  const session = await auth()
  
  if (!session?.user?.id) {
    redirect('/auth/signin')
  }

  const { examId, attemptId } = await params
  const userRoles = session.user.roles || []
  const result = await getExamResultsForStudent(attemptId, session.user.id, { userRoles })

  if (!result.success || !result.attempt) {
    notFound()
  }

  // Validate that the examId in URL matches the attempt's examId
  if (result.attempt.exam.id !== examId) {
    notFound()
  }

  const { attempt, isOwner } = result
  const exam = attempt.exam
  const isAdminOrTeacher = userRoles.includes('ADMIN') || userRoles.includes('TEACHER')

  // Solo mostrar mensaje de "resultados no disponibles" si es el dueño y showResults está desactivado
  // Admins y profesores siempre pueden ver los resultados
  if (!exam.showResults && isOwner && !isAdminOrTeacher) {
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
    partialCredit: boolean
    sectionTitle: string
  }

  // Tipo para los detalles de multiple choice
  type MultipleChoiceDetail = {
    itemQuestion: string
    userOptionLetter: string | null
    userOptionText: string | null
    correctOptionLetter: string
    correctOptionText: string
    isCorrect: boolean
  }

  // Tipo para los resultados de las preguntas
  type QuestionResult = {
    id: string
    questionNumber: number
    type: string
    category: string | undefined
    question: string
    userAnswer: string | null
    correctAnswer: string
    isCorrect: boolean
    pointsEarned: number
    maxPoints: number
    explanation: string | null
    audioUrl: string | undefined
    needsReview: boolean
    isInformativeBlock: boolean
    informativeContent?: {
      type: string
      audioUrl?: string
      videoUrl?: string
      imageUrl?: string
      text?: string
      title?: string
    }
    multipleChoiceDetails?: MultipleChoiceDetail[]
  }

  // Obtener todas las preguntas del examen ordenadas por orden
  const allExamQuestions: ExamQuestion[] = exam.questions
    .sort((a: { order: number }, b: { order: number }) => a.order - b.order)
    .map((q: { id: string; type: string; question: string; options: unknown; correctAnswer: unknown; explanation: string | null; points: number; tags: string[]; order: number; partialCredit: boolean }) => ({ ...q, sectionTitle: '' }))

  // Crear mapa de respuestas por questionId
  const answersMap = new Map(attempt.answers.map(a => [a.questionId, a]))

  // Generar resultados en el orden del examen, incluyendo bloques informativos
  let questionNumber = 0
  const questionResults: QuestionResult[] = allExamQuestions.flatMap((question): QuestionResult[] => {
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
        audioUrl: undefined,
        needsReview: false,
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
    
    if (multipleChoiceItems && multipleChoiceItems.length > 0) {
      // Verificar si permite crédito parcial
      const partialCredit = question.partialCredit || false
      const userAnswers = answer?.answer as Record<string, string> | null
      
      // Parsear correctAnswer para obtener los IDs correctos por índice
      const correctAnswerArray = Array.isArray(correctAnswer) 
        ? correctAnswer as string[]
        : typeof correctAnswer === 'string' 
          ? (() => { try { return JSON.parse(correctAnswer) } catch { return correctAnswer.split(',').map(s => s.trim()) } })()
          : []
      
      // Función para obtener letra de opción (A, B, C, D...)
      const getOptionLetter = (index: number): string => {
        return String.fromCharCode(65 + index) // A=65, B=66, etc.
      }
      
      if (partialCredit) {
        // EXPANDIR: Tratar cada sub-pregunta como individual
        const pointsPerItem = Math.round(question.points / multipleChoiceItems.length)
        
        return multipleChoiceItems.map((item, index) => {
          const userAnswer = userAnswers?.[item.id] || null
          const correctOptionId = item.correctOptionId || correctAnswerArray[index]
          
          const userOptionIndex = userAnswer ? item.options.findIndex(opt => opt.id === userAnswer) : -1
          const correctOptionIndex = item.options.findIndex(opt => opt.id === correctOptionId)
          
          const userOption = userOptionIndex >= 0 ? item.options[userOptionIndex] : null
          const correctOption = correctOptionIndex >= 0 ? item.options[correctOptionIndex] : null
          
          const isCorrect = userAnswer === correctOptionId
          
          questionNumber++
          
          return {
            id: `${answer?.id || 'no-answer'}-${item.id}`,
            questionNumber,
            type: question.type,
            category: question.tags?.[0] || undefined,
            question: item.question,
            userAnswer: userOption?.text || null,
            correctAnswer: correctOption?.text || '(Opción no encontrada)',
            isCorrect: isCorrect,
            pointsEarned: isCorrect ? pointsPerItem : 0,
            maxPoints: pointsPerItem,
            explanation: question.explanation,
            audioUrl: undefined,
            needsReview: false,
            isInformativeBlock: false,
            multipleChoiceDetails: undefined
          }
        })
      } else {
        // NO EXPANDIR: Mantener como un solo bloque (comportamiento actual)
        questionNumber++
        
        // Generar detalles de cada ítem
        const multipleChoiceDetails = multipleChoiceItems.map((item, index) => {
          const userAnswer = userAnswers?.[item.id] || null
          const correctOptionId = item.correctOptionId || correctAnswerArray[index]
          
          const userOptionIndex = userAnswer ? item.options.findIndex(opt => opt.id === userAnswer) : -1
          const correctOptionIndex = item.options.findIndex(opt => opt.id === correctOptionId)
          
          const userOption = userOptionIndex >= 0 ? item.options[userOptionIndex] : null
          const correctOption = correctOptionIndex >= 0 ? item.options[correctOptionIndex] : null
          
          return {
            itemQuestion: item.question,
            userOptionLetter: userOptionIndex >= 0 ? getOptionLetter(userOptionIndex) : null,
            userOptionText: userOption?.text || null,
            correctOptionLetter: correctOptionIndex >= 0 ? getOptionLetter(correctOptionIndex) : '?',
            correctOptionText: correctOption?.text || '(Opción no encontrada)',
            isCorrect: userAnswer === correctOptionId
          }
        })
        
        // Calcular si todas las respuestas son correctas
        const allCorrect = multipleChoiceDetails.every(d => d.isCorrect)
        const correctCount = multipleChoiceDetails.filter(d => d.isCorrect).length
        
        return [{
          id: answer?.id || `no-answer-${question.id}`,
          questionNumber,
          type: question.type,
          category: question.tags?.[0] || undefined,
          question: question.question,
          userAnswer: null, // No se usa cuando hay multipleChoiceDetails
          correctAnswer: '', // No se usa cuando hay multipleChoiceDetails
          isCorrect: allCorrect,
          pointsEarned: answer?.pointsEarned ?? Math.round((correctCount / multipleChoiceItems.length) * question.points),
          maxPoints: question.points,
          explanation: question.explanation,
          audioUrl: undefined,
          needsReview: false,
          isInformativeBlock: false,
          multipleChoiceDetails
        }]
      }
    }
    
    // Bloque verdadero/falso de varias sentencias (mismo patrón que multiple_choice)
    const trueFalseItems = options?.trueFalseItems as {
      id: string
      statement: string
      correctAnswer: boolean
    }[] | undefined

    if (trueFalseItems && trueFalseItems.length > 1) {
      const partialCredit = question.partialCredit || false
      const userAnswers = answer?.answer as Record<string, unknown> | null
      const toLabel = (v: boolean) => (v ? 'Verdadero' : 'Falso')

      if (partialCredit) {
        // EXPANDIR: cada sentencia como sub-pregunta individual
        const pointsPerItem = Math.round(question.points / trueFalseItems.length)

        return trueFalseItems.map((item) => {
          const userBool = normalizeTrueFalseAnswer(userAnswers?.[item.id])
          const isCorrect = userBool === item.correctAnswer

          questionNumber++

          return {
            id: `${answer?.id || 'no-answer'}-${item.id}`,
            questionNumber,
            type: question.type,
            category: question.tags?.[0] || undefined,
            question: item.statement,
            userAnswer: userBool === null ? null : toLabel(userBool),
            correctAnswer: toLabel(item.correctAnswer),
            isCorrect,
            pointsEarned: isCorrect ? pointsPerItem : 0,
            maxPoints: pointsPerItem,
            explanation: question.explanation,
            audioUrl: undefined,
            needsReview: false,
            isInformativeBlock: false,
            multipleChoiceDetails: undefined,
          }
        })
      } else {
        // NO EXPANDIR: una sola fila con el detalle por sentencia (todo o nada)
        questionNumber++

        const trueFalseDetails = trueFalseItems.map((item) => {
          const userBool = normalizeTrueFalseAnswer(userAnswers?.[item.id])
          return {
            itemQuestion: item.statement,
            userOptionLetter: userBool === null ? null : userBool ? 'V' : 'F',
            userOptionText: userBool === null ? null : toLabel(userBool),
            correctOptionLetter: item.correctAnswer ? 'V' : 'F',
            correctOptionText: toLabel(item.correctAnswer),
            isCorrect: userBool === item.correctAnswer,
          }
        })

        const allCorrect = trueFalseDetails.every((d) => d.isCorrect)

        return [{
          id: answer?.id || `no-answer-${question.id}`,
          questionNumber,
          type: question.type,
          category: question.tags?.[0] || undefined,
          question: question.question,
          userAnswer: null,
          correctAnswer: '',
          isCorrect: allCorrect,
          pointsEarned: answer?.pointsEarned ?? 0,
          maxPoints: question.points,
          explanation: question.explanation,
          audioUrl: undefined,
          needsReview: false,
          isInformativeBlock: false,
          multipleChoiceDetails: trueFalseDetails,
        }]
      }
    }

    // Respuesta normal (no expandida)
    questionNumber++

    // Para preguntas tipo ESSAY o RECORDING, no mostrar "null" como respuesta correcta
    const isEssayType = ['ESSAY', 'RECORDING'].includes(question.type)
    
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
    
    // Verdadero/Falso de una sola sentencia: mostrar etiquetas consistentes
    // ("Verdadero"/"Falso") en vez del booleano crudo del estudiante.
    const isTrueFalse = question.type === 'TRUE_FALSE'
    const tfLabel = (v: boolean | null): string | null => (v === null ? null : v ? 'Verdadero' : 'Falso')

    const displayCorrectAnswer = isEssayType
      ? 'Requiere revisión manual del profesor'
      : isTrueFalse
        ? tfLabel(normalizeTrueFalseAnswer(Array.isArray(correctAnswer) ? correctAnswer[0] : correctAnswer)) ?? 'N/A'
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

    // Para verdadero/falso, normalizar a "Verdadero"/"Falso" (incluye el caso
    // `false`, que el bloque anterior trataría como "sin responder").
    if (isTrueFalse && answer?.answer !== undefined && answer?.answer !== null) {
      displayUserAnswer = tfLabel(normalizeTrueFalseAnswer(answer.answer))
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
