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
    redirect('/auth/signin')
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

  // Eliminar duplicados de estudiantes (mismo userId puede tener múltiples intentos)
  const uniqueStudents = new Map()
  allAttempts.forEach(a => {
    if (!uniqueStudents.has(a.userId)) {
      uniqueStudents.set(a.userId, {
        id: a.userId,
        name: `${a.user.name || ''} ${a.user.lastName || ''}`.trim() || a.user.email,
        email: a.user.email,
        score: a.score ?? 0
      })
    }
  })
  const students = Array.from(uniqueStudents.values())
  
  // Agrupar intentos por estudiante
  const attemptsByStudent = new Map()
  allAttempts.forEach(a => {
    if (!attemptsByStudent.has(a.userId)) {
      attemptsByStudent.set(a.userId, [])
    }
    attemptsByStudent.get(a.userId).push({
      id: a.id,
      attemptNumber: a.attemptNumber,
      score: a.score ?? 0,
      submittedAt: a.submittedAt 
        ? new Date(a.submittedAt).toLocaleString('es-ES', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })
        : 'N/A'
    })
  })

  // Crear un mapa de respuestas por questionId para acceso rápido
  const answersMap = new Map(attempt.answers.map(a => [a.questionId, a]))

  // Tipos de bloques informativos que no requieren respuesta
  const INFORMATIVE_BLOCK_TYPES = ['title', 'text', 'audio', 'video', 'image']
  
  // Tipo para multipleChoiceItems
  type MultipleChoiceItem = { id: string; question: string; options: { id: string; text: string }[] }
  
  // Función para obtener letra de opción (A, B, C, D...)
  const getOptionLetter = (index: number): string => {
    return String.fromCharCode(65 + index) // A=65, B=66, etc.
  }
  
  // Obtener TODAS las preguntas del examen (incluyendo bloques informativos)
  const allQuestions = attempt.exam.questions.map(q => {
      // Extraer groupId, originalBlockType y contenido de las opciones
      let groupId: string | null = null
      let originalBlockType: string | null = null
      let multipleChoiceItems: MultipleChoiceItem[] | null = null
      let informativeContent: Record<string, unknown> | null = null
      
      const parseOptions = (opts: unknown) => {
        if (opts && typeof opts === 'object' && !Array.isArray(opts)) {
          const parsed = opts as Record<string, unknown>
          groupId = parsed.groupId as string || null
          originalBlockType = parsed.originalBlockType as string || null
          multipleChoiceItems = parsed.multipleChoiceItems as MultipleChoiceItem[] || null
          // Extraer contenido informativo (diferentes campos según el tipo de bloque)
          informativeContent = {
            audioUrl: parsed.audioUrl || parsed.url, // audio blocks use 'url', questions use 'audioUrl'
            videoUrl: parsed.videoUrl || (parsed.type === 'video' ? parsed.url : undefined),
            imageUrl: parsed.imageUrl || (parsed.type === 'image' ? parsed.url : undefined),
            text: parsed.text || parsed.content,
            title: parsed.title,
            content: parsed.content,
            url: parsed.url, // URL genérica para cualquier tipo de media
          }
        }
      }
      
      if (q.options && typeof q.options === 'object' && !Array.isArray(q.options)) {
        parseOptions(q.options)
      } else if (typeof q.options === 'string') {
        try {
          const parsed = JSON.parse(q.options)
          parseOptions(parsed)
        } catch {
          // Ignorar errores de parsing
        }
      }
      
      const isInformative = originalBlockType && INFORMATIVE_BLOCK_TYPES.includes(originalBlockType)
      
      return { 
        ...q, 
        sectionTitle: '', 
        groupId, 
        originalBlockType, 
        multipleChoiceItems,
        isInformativeBlock: isInformative,
        informativeContent
      }
    })

  // Tipo para detalles de sub-respuestas de opción múltiple
  type MultipleChoiceSubAnswer = {
    itemQuestion: string
    userOptionLetter: string | null
    userOptionText: string | null
    correctOptionLetter: string
    correctOptionText: string
    isCorrect: boolean
  }

  // Función para obtener detalles de opción múltiple con múltiples pasos
  const getMultipleChoiceDetails = (
    answerData: unknown,
    correctAnswer: unknown,
    items: MultipleChoiceItem[]
  ): MultipleChoiceSubAnswer[] => {
    const userAnswers = answerData as Record<string, string> | null
    const correctAnswerArray = Array.isArray(correctAnswer) 
      ? correctAnswer as string[]
      : typeof correctAnswer === 'string' 
        ? (() => { try { return JSON.parse(correctAnswer) } catch { return correctAnswer.split(',').map(s => s.trim()) } })()
        : []
    
    return items.map((item, index) => {
      const userOptionId = userAnswers?.[item.id] || null
      const correctOptionId = correctAnswerArray[index]
      
      const userOptionIndex = userOptionId ? item.options.findIndex(opt => opt.id === userOptionId) : -1
      const correctOptionIndex = item.options.findIndex(opt => opt.id === correctOptionId)
      
      const userOption = userOptionIndex >= 0 ? item.options[userOptionIndex] : null
      const correctOption = correctOptionIndex >= 0 ? item.options[correctOptionIndex] : null
      
      return {
        itemQuestion: item.question,
        userOptionLetter: userOptionIndex >= 0 ? getOptionLetter(userOptionIndex) : null,
        userOptionText: userOption?.text || null,
        correctOptionLetter: correctOptionIndex >= 0 ? getOptionLetter(correctOptionIndex) : '?',
        correctOptionText: correctOption?.text || '(Opción no encontrada)',
        isCorrect: userOptionId === correctOptionId
      }
    })
  }

  // Mapear TODAS las preguntas (incluyendo bloques informativos)
  let questionNumber = 0
  const answers = allQuestions.map((question) => {
    const isInformative = question.isInformativeBlock
    
    // Solo incrementar número para preguntas que requieren respuesta
    if (!isInformative) {
      questionNumber++
    }
    
    const answer = answersMap.get(question.id)
    const mcItems = question.multipleChoiceItems as MultipleChoiceItem[] | null
    
    // Para bloques informativos, retornar estructura especial
    if (isInformative) {
      const infoContent = question.informativeContent as Record<string, unknown> | null
      return {
        id: `informative-${question.id}`,
        questionId: question.id,
        questionNumber: 0, // 0 indica bloque informativo
        questionType: question.originalBlockType || question.type,
        questionText: question.question,
        category: question.tags?.[0],
        maxPoints: 0,
        userAnswer: null,
        correctAnswer: undefined,
        isCorrect: null,
        pointsEarned: 0,
        needsReview: false,
        feedback: null,
        isAutoGraded: false,
        groupId: question.groupId,
        sectionTitle: question.sectionTitle,
        isInformativeBlock: true,
        informativeContent: {
          type: question.originalBlockType || 'unknown',
          audioUrl: (infoContent?.audioUrl || infoContent?.url) as string | undefined,
          videoUrl: (infoContent?.videoUrl || (question.originalBlockType === 'video' ? infoContent?.url : undefined)) as string | undefined,
          imageUrl: (infoContent?.imageUrl || (question.originalBlockType === 'image' ? infoContent?.url : undefined)) as string | undefined,
          text: (infoContent?.text || infoContent?.content) as string | undefined,
          title: infoContent?.title as string | undefined,
        },
        multipleChoiceDetails: undefined,
      }
    }
    
    // Formatear respuesta del usuario (texto simple para mostrar)
    let userAnswerFormatted: string | null = null
    let multipleChoiceDetails: MultipleChoiceSubAnswer[] | undefined = undefined
    let userAudioUrl: string | undefined = undefined
    
    if (mcItems && mcItems.length > 0) {
      // Obtener detalles completos para opción múltiple con múltiples pasos
      multipleChoiceDetails = getMultipleChoiceDetails(answer?.answer, question.correctAnswer, mcItems)
      // Texto formateado para mostrar
      userAnswerFormatted = multipleChoiceDetails.map(d => 
        `${d.itemQuestion}: ${d.userOptionLetter ? `(${d.userOptionLetter}) ${d.userOptionText}` : '(Sin respuesta)'}`
      ).join('\n')
    } else if (answer?.answer) {
      // Verificar si la respuesta es un objeto con audioUrl (grabación de voz)
      if (typeof answer.answer === 'object' && answer.answer !== null) {
        const answerObj = answer.answer as Record<string, unknown>
        if (answerObj.audioUrl) {
          userAudioUrl = answerObj.audioUrl as string
          userAnswerFormatted = null // No mostrar texto, se mostrará el audio
        } else {
          userAnswerFormatted = JSON.stringify(answer.answer, null, 2)
        }
      } else {
        userAnswerFormatted = String(answer.answer)
      }
    }
    
    // Formatear respuesta correcta
    let correctAnswerFormatted: string | undefined = undefined
    if (mcItems && mcItems.length > 0 && multipleChoiceDetails) {
      correctAnswerFormatted = multipleChoiceDetails.map(d => 
        `${d.itemQuestion}: (${d.correctOptionLetter}) ${d.correctOptionText}`
      ).join('\n')
    } else if (question.correctAnswer !== null && question.correctAnswer !== undefined) {
      correctAnswerFormatted = Array.isArray(question.correctAnswer) 
        ? (question.correctAnswer as string[]).join(', ') 
        : String(question.correctAnswer)
    }
    
    return {
      id: answer?.id || `no-answer-${question.id}`,
      questionId: question.id,
      questionNumber,
      questionType: question.type,
      questionText: question.question,
      category: question.tags?.[0],
      maxPoints: question.points,
      userAnswer: userAnswerFormatted,
      userAudioUrl,
      correctAnswer: correctAnswerFormatted,
      isCorrect: answer?.isCorrect ?? null,
      pointsEarned: answer?.pointsEarned ?? 0,
      needsReview: answer?.needsReview ?? (question.type === 'ESSAY'),
      feedback: answer?.feedback ?? null,
      isAutoGraded: answer ? (!answer.needsReview && answer.reviewedBy !== session.user.id) : false,
      groupId: question.groupId,
      sectionTitle: question.sectionTitle,
      isInformativeBlock: false,
      informativeContent: undefined,
      multipleChoiceDetails,
    }
  })

  // Calcular puntaje basado en las respuestas individuales (no usar attempt.totalPoints que puede ser 0 si hay preguntas pendientes)
  const totalScore = answers.reduce((sum: number, a) => sum + a.pointsEarned, 0)
  const maxScore = answers.reduce((sum: number, a) => sum + a.maxPoints, 0)

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
      attemptsByStudent={attemptsByStudent}
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
