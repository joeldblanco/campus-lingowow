'use client'

import { useState, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  FileText,
  Save,
  Send,
  Volume2,
  Video,
  ImageIcon,
  Type,
  FileTextIcon,
  FileDown,
  Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn, processHtmlLinks } from '@/lib/utils'
import { toast } from 'sonner'
import { exportAttemptToHTML } from '@/lib/html-export-attempt'

interface StudentInfo {
  id: string
  userId: string
  name: string
  email: string
  score: number
  attemptNumber: number
}

interface ExamAttemptInfo {
  id: string
  attemptNumber: number
  submittedAt: string
  status: 'PENDING_REVIEW' | 'COMPLETED' | 'IN_PROGRESS'
}

// Tipo para sub-respuestas de opción múltiple con múltiples pasos
interface MultipleChoiceSubAnswer {
  itemQuestion: string
  userOptionLetter: string | null
  userOptionText: string | null
  correctOptionLetter: string
  correctOptionText: string
  isCorrect: boolean
}

interface QuestionAnswer {
  id: string
  questionId: string
  questionNumber: number | null // null para bloques informativos
  questionType: string
  questionText: string
  category?: string
  maxPoints: number
  userAnswer: string | null
  userAudioUrl?: string // URL de audio grabado por el estudiante
  correctAnswer?: string
  isCorrect: boolean | null
  pointsEarned: number
  needsReview: boolean
  feedback?: string | null
  isAutoGraded: boolean
  groupId?: string | null
  sectionTitle?: string
  isInformativeBlock?: boolean // Para bloques de audio, video, texto, etc.
  informativeContent?: { // Contenido del bloque informativo
    type: string
    audioUrl?: string
    videoUrl?: string
    imageUrl?: string
    text?: string
    title?: string
  }
  multipleChoiceDetails?: MultipleChoiceSubAnswer[] // Detalles de cada sub-pregunta
}

interface ExamGradingViewProps {
  examId: string
  examTitle: string
  courseName: string
  students: StudentInfo[]
  attemptsByStudent: Record<string, Array<{
    id: string
    attemptNumber: number
    score: number
    submittedAt: string
  }>>
  selectedStudentId: string
  attempt: ExamAttemptInfo
  totalScore: number
  maxScore: number
  answers: QuestionAnswer[]
  onSelectStudent: (studentId: string) => void
  onSaveGrade: (answerId: string, pointsEarned: number, feedback: string) => Promise<void>
  onFinalizeReview: () => Promise<void>
  breadcrumbs?: { label: string; href: string }[]
}

export function ExamGradingView({
  examId,
  examTitle,
  courseName,
  students,
  attemptsByStudent,
  selectedStudentId,
  attempt,
  totalScore,
  maxScore,
  answers,
  onSelectStudent,
  onSaveGrade,
  onFinalizeReview,
  breadcrumbs = []
}: ExamGradingViewProps) {
  const router = useRouter()
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  
  // Obtener intentos del estudiante seleccionado
  const studentAttempts = attemptsByStudent[selectedStudentId] || []
  const [localGrades, setLocalGrades] = useState<Record<string, { points: number; feedback: string }>>(() => {
    // Inicializar con valores existentes para que el botón funcione inmediatamente
    const initialGrades: Record<string, { points: number; feedback: string }> = {}
    answers.forEach(answer => {
      if (answer.needsReview) {
        initialGrades[answer.id] = {
          points: answer.pointsEarned,
          feedback: answer.feedback || ''
        }
      }
    })
    return initialGrades
  })
  const [isSaving, setIsSaving] = useState(false)
  const [isFinishing, setIsFinishing] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const navigationContainerRef = useRef<HTMLDivElement>(null)

  const currentAnswer = answers[currentQuestionIndex]
  const pendingReviewCount = answers.filter(a => a.needsReview && !a.isInformativeBlock).length
  const needsReview = pendingReviewCount > 0

  // Obtener todas las preguntas del grupo actual (si pertenece a un grupo)
  const currentGroupAnswers = useMemo(() => {
    if (!currentAnswer) return []
    
    const currentGroupId = currentAnswer.groupId
    if (!currentGroupId) return [currentAnswer]
    
    return answers.filter(a => a.groupId === currentGroupId)
  }, [currentAnswer, answers])

  // Calcular índices de navegación (primer índice de cada grupo o pregunta individual)
  // Excluir bloques informativos del navegador
  const navigationIndices = useMemo(() => {
    const indices: number[] = []
    const processedGroupIds = new Set<string>()
    
    answers.forEach((a, index) => {
      // Saltar bloques informativos
      if (a.isInformativeBlock) return
      
      const groupId = a.groupId
      
      if (groupId) {
        if (!processedGroupIds.has(groupId)) {
          indices.push(index)
          processedGroupIds.add(groupId)
        }
      } else {
        indices.push(index)
      }
    })
    
    return indices
  }, [answers])

  const getQuestionStatus = (answer: QuestionAnswer): 'pending' | 'correct' | 'incorrect' | 'unanswered' => {
    if (answer.needsReview) return 'pending'
    if (answer.isCorrect === true) return 'correct'
    if (answer.isCorrect === false) return 'incorrect'
    return 'unanswered'
  }
  
  // Generar estados para el navegador de preguntas (solo preguntas respondibles)
  const navigatorQuestions = useMemo(() => {
    return navigationIndices.map((navIndex, displayIndex) => {
      const answer = answers[navIndex]
      const status = getQuestionStatus(answer)
      return {
        id: answer.id,
        displayNumber: displayIndex + 1,
        navIndex,
        status
      }
    })
  }, [navigationIndices, answers])

  const handleSaveGrade = useCallback(async (answerId: string) => {
    // Obtener calificación actual (local o de la respuesta)
    const currentGrade = localGrades[answerId] || {
      points: answers.find(a => a.id === answerId)?.pointsEarned || 0,
      feedback: answers.find(a => a.id === answerId)?.feedback || ''
    }
    
    setIsSaving(true)
    try {
      let finalAnswerId = answerId
      
      // Si es no-answer, crear la respuesta primero
      if (answerId.startsWith('no-answer-')) {
        const questionId = answerId.replace('no-answer-', '')
        
        // Importar dinámicamente para evitar circular dependencies
        const { createEmptyAnswer } = await import('@/lib/actions/exams')
        const createResult = await createEmptyAnswer(questionId, attempt.id)
        
        if (!createResult.success) {
          toast.error('Error al crear respuesta')
          return
        }
        
        finalAnswerId = createResult.answer!.id
      }
      
      await onSaveGrade(finalAnswerId, currentGrade.points, currentGrade.feedback)
      toast.success('Calificación guardada')
      
      // Limpiar estado local de esta pregunta
      setLocalGrades(prev => {
        const newGrades = { ...prev }
        delete newGrades[answerId]
        return newGrades
      })
      
      // Forzar refresh de la página para obtener datos actualizados
      router.refresh()
    } catch (error) {
      console.error('Error saving grade:', error)
      toast.error('Error al guardar calificación')
    } finally {
      setIsSaving(false)
    }
  }, [localGrades, answers, onSaveGrade, router, attempt.id])

  const handleFinalizeReview = useCallback(async () => {
    setIsFinishing(true)
    try {
      await onFinalizeReview()
      toast.success('Revisión finalizada')
      router.refresh()
    } catch (error) {
      console.error('Error finalizing review:', error)
      toast.error('Error al finalizar revisión')
    } finally {
      setIsFinishing(false)
    }
  }, [onFinalizeReview, router])

  const updateLocalGrade = (answerId: string, field: 'points' | 'feedback', value: number | string) => {
    setLocalGrades(prev => ({
      ...prev,
      [answerId]: {
        ...prev[answerId],
        points: prev[answerId]?.points ?? 0,
        feedback: prev[answerId]?.feedback ?? '',
        [field]: value
      }
    }))
  }

  // Scroll automático al contenedor de navegación cuando cambia la pregunta
  const scrollToNavigation = useCallback(() => {
    if (navigationContainerRef.current) {
      navigationContainerRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' // Centra el contenedor en la vista, dejando espacio arriba y abajo
      })
    }
  }, [])

  // Wrapper para setCurrentQuestionIndex que incluye scroll
  const setCurrentQuestionWithScroll = useCallback((newIndex: number) => {
    setCurrentQuestionIndex(newIndex)
    // Pequeño delay para asegurar que el DOM se actualizó antes del scroll
    setTimeout(scrollToNavigation, 100)
  }, [scrollToNavigation])

  // Exportar HTML del attempt
  const handleExportPDF = useCallback(async () => {
    const selectedStudent = students.find(s => s.id === selectedStudentId)
    if (!selectedStudent) return

    setIsExporting(true)
    try {
      await exportAttemptToHTML({
        studentName: selectedStudent.name,
        studentEmail: selectedStudent.email,
        examTitle,
        courseName,
        attemptId: attempt.id,
        attemptNumber: attempt.attemptNumber,
        submittedAt: attempt.submittedAt,
        totalScore,
        maxScore,
        answers
      })
      toast.success('Reporte exportado exitosamente')
    } catch (error) {
      console.error('Error exporting report:', error)
      toast.error('Error al exportar el reporte')
    } finally {
      setIsExporting(false)
    }
  }, [students, selectedStudentId, examTitle, courseName, attempt, totalScore, maxScore, answers])

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1400px] mx-auto px-6 py-4">
        {breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            {breadcrumbs.map((crumb, index) => (
              <span key={crumb.href} className="flex items-center gap-2">
                {index > 0 && <ChevronRight className="h-4 w-4" />}
                <Link href={crumb.href} className="hover:text-primary transition-colors">
                  {crumb.label}
                </Link>
              </span>
            ))}
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground font-medium">Revisar Intento</span>
          </nav>
        )}

        <div className="flex flex-wrap items-center gap-4 mb-6">
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1 block">Seleccionar Estudiante</label>
            <select
              value={selectedStudentId}
              onChange={(e) => onSelectStudent(e.target.value)}
              className="h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-foreground min-w-[200px]"
            >
              {students.map(student => (
                <option key={student.id} value={student.id}>
                  {student.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1 block">Intento del Examen</label>
            <select
              value={attempt.id}
              onChange={(e) => {
                // Navegar al intento seleccionado
                const newAttemptId = e.target.value
                router.push(`/teacher/grading/${examId}/${newAttemptId}`)
              }}
              className="h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-foreground min-w-[200px]"
              disabled={studentAttempts.length === 0}
            >
              {studentAttempts.map(attempt => (
                <option key={attempt.id} value={attempt.id}>
                  Intento #{attempt.attemptNumber} ({Math.round(attempt.score)}%) - {attempt.submittedAt}
                </option>
              ))}
            </select>
          </div>

          <div className="ml-auto flex items-center gap-4">
            <Button
              onClick={handleExportPDF}
              disabled={isExporting}
              variant="outline"
              size="sm"
              className="h-10"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Exportando...
                </>
              ) : (
                <>
                  <FileDown className="w-4 h-4 mr-2" />
                  Exportar PDF
                </>
              )}
            </Button>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Puntaje Total</p>
              <p className="text-2xl font-bold text-foreground">{totalScore}<span className="text-muted-foreground text-base">/{maxScore}</span></p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Estado</p>
              <Badge variant={needsReview ? "destructive" : "default"} className="mt-1">
                {needsReview ? `🔴 Necesita Revisión` : '✅ Completado'}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-[1400px] mx-auto px-6 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <aside className="lg:col-span-3 space-y-6">
            <div className="bg-white dark:bg-[#1a2632] rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="font-bold text-foreground text-sm uppercase tracking-wider mb-4">Navegador de Preguntas</h3>
              <div className="grid grid-cols-5 gap-2">
                {navigatorQuestions.map((q) => {
                  const isCurrent = q.navIndex === currentQuestionIndex
                  return (
                    <button
                      key={q.id}
                      onClick={() => setCurrentQuestionWithScroll(q.navIndex)}
                      className={cn(
                        "aspect-square flex items-center justify-center rounded-lg text-sm font-bold transition-colors",
                        isCurrent && "ring-2 ring-primary",
                        q.status === 'correct' && "bg-green-100 text-green-700",
                        q.status === 'incorrect' && "bg-red-100 text-red-700",
                        q.status === 'pending' && "bg-yellow-100 text-yellow-700",
                        q.status === 'unanswered' && "bg-gray-100 text-gray-500"
                      )}
                    >
                      {q.displayNumber}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900 rounded-xl p-4">
              <h4 className="font-bold text-foreground text-sm mb-2">Nota del Profesor</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Este examen incluye {answers.filter(a => a.needsReview && !a.isInformativeBlock).length} pregunta(s) de ensayo que requieren calificación manual.
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => toast.info('La rúbrica de calificación estará disponible próximamente')}
              >
                Ver Rúbrica de Calificación
              </Button>
            </div>
          </aside>

          <div className="lg:col-span-9 space-y-6">
            {currentGroupAnswers.length > 0 ? (
              <div className="space-y-6">
                {currentGroupAnswers.length > 1 && (
                  <Badge variant="secondary" className="mb-2">
                    Grupo de {currentGroupAnswers.length} preguntas
                  </Badge>
                )}
                
                {currentGroupAnswers.map((answer) => {
                  // Renderizar bloque informativo
                  if (answer.isInformativeBlock) {
                    const infoType = answer.informativeContent?.type || 'unknown'
                    const InfoIcon = infoType === 'audio' ? Volume2 
                      : infoType === 'video' ? Video 
                      : infoType === 'image' ? ImageIcon 
                      : infoType === 'title' ? Type 
                      : FileTextIcon
                    
                    return (
                      <div key={answer.id} className="bg-blue-50 dark:bg-blue-900/20 rounded-xl shadow-sm border border-blue-200 dark:border-blue-700 p-6">
                        <div className="flex items-center gap-3 mb-4">
                          <InfoIcon className="h-5 w-5 text-blue-600" />
                          <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
                            Contenido Informativo
                          </Badge>
                        </div>
                        
                        {answer.informativeContent?.title && (
                          <h3 className="text-xl font-bold text-foreground mb-4">{answer.informativeContent.title}</h3>
                        )}
                        
                        {answer.informativeContent?.text && (
                          <div 
                            className="text-foreground mb-4 prose prose-sm dark:prose-invert max-w-none"
                            dangerouslySetInnerHTML={{ __html: processHtmlLinks(answer.informativeContent.text) }}
                          />
                        )}
                        
                        {answer.informativeContent?.audioUrl && (
                          <div className="mb-4">
                            <p className="text-sm text-muted-foreground mb-2">Audio:</p>
                            <audio controls className="w-full">
                              <source src={answer.informativeContent.audioUrl} />
                              Tu navegador no soporta el elemento de audio.
                            </audio>
                          </div>
                        )}
                        
                        {answer.informativeContent?.videoUrl && (
                          <div className="mb-4">
                            <p className="text-sm text-muted-foreground mb-2">Video:</p>
                            <video controls className="w-full max-h-96">
                              <source src={answer.informativeContent.videoUrl} />
                              Tu navegador no soporta el elemento de video.
                            </video>
                          </div>
                        )}
                        
                        {answer.informativeContent?.imageUrl && (
                          <div className="mb-4">
                            <Image 
                              src={answer.informativeContent.imageUrl} 
                              alt="Imagen informativa" 
                              width={512}
                              height={256}
                              className="max-w-full h-auto rounded-lg"
                            />
                          </div>
                        )}
                        
                        {!answer.informativeContent?.title && !answer.informativeContent?.text && 
                         !answer.informativeContent?.audioUrl && !answer.informativeContent?.videoUrl && 
                         !answer.informativeContent?.imageUrl && (
                          <p className="text-muted-foreground italic">{answer.questionText || 'Contenido informativo'}</p>
                        )}
                      </div>
                    )
                  }
                  
                  return (
                    <div key={answer.id} className="bg-white dark:bg-[#1a2632] rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="flex items-center gap-3">
                          <span className="text-muted-foreground font-medium">Pregunta {answer.questionNumber}</span>
                          {answer.needsReview ? (
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                              Pendiente de Revisión
                            </Badge>
                          ) : answer.isAutoGraded ? (
                            <Badge variant="outline" className={cn(
                              answer.isCorrect 
                                ? "bg-green-50 text-green-700 border-green-300"
                                : "bg-red-50 text-red-700 border-red-300"
                            )}>
                              Auto-calificada: {answer.isCorrect ? 'Correcta' : 'Incorrecta'}
                            </Badge>
                          ) : answer.userAnswer === null ? (
                            <Badge variant="outline" className={cn(
                              answer.needsReview 
                                ? "bg-yellow-50 text-yellow-700 border-yellow-300"
                                : "bg-gray-50 text-gray-700 border-gray-300"
                            )}>
                              {answer.needsReview ? "Sin respuesta (Pendiente)" : "Sin respuesta"}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                              Calificada Manualmente
                            </Badge>
                          )}
                        </div>
                        <span className="text-sm text-muted-foreground">{answer.maxPoints} Puntos</span>
                      </div>

                      {answer.category && (
                        <p className="text-sm text-muted-foreground mb-2">{answer.category}</p>
                      )}

                      <h3 className="text-xl font-bold text-foreground mb-6">{answer.questionText}</h3>

                      {/* Mostrar detalles de opción múltiple con múltiples pasos */}
                      {answer.multipleChoiceDetails && answer.multipleChoiceDetails.length > 0 ? (
                        <div className="space-y-4 mb-6">
                          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900 rounded-lg p-4">
                            <div className="flex items-start justify-between mb-3">
                              <span className="text-sm font-bold text-amber-800 dark:text-amber-400 uppercase">Respuestas del Estudiante</span>
                              <span className="text-xs text-muted-foreground">Enviado a las {attempt.submittedAt}</span>
                            </div>
                            <div className="space-y-2">
                              {answer.multipleChoiceDetails.map((detail, idx) => (
                                <div 
                                  key={idx} 
                                  className={cn(
                                    "p-3 rounded-md border",
                                    detail.isCorrect 
                                      ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
                                      : "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800"
                                  )}
                                >
                                  <div className="flex items-start gap-2">
                                    {detail.isCorrect ? (
                                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                                    ) : (
                                      <XCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                                    )}
                                    <div className="flex-1">
                                      <p className="font-medium text-sm">{detail.itemQuestion}</p>
                                      <p className={cn(
                                        "text-sm mt-1",
                                        detail.isCorrect ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"
                                      )}>
                                        {detail.userOptionLetter 
                                          ? `Respondió: (${detail.userOptionLetter}) ${detail.userOptionText}`
                                          : 'No respondió'}
                                      </p>
                                      {!detail.isCorrect && (
                                        <p className="text-sm text-muted-foreground mt-1">
                                          Correcta: ({detail.correctOptionLetter}) {detail.correctOptionText}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900 rounded-lg p-4 mb-6">
                          <div className="flex items-start justify-between mb-2">
                            <span className="text-sm font-bold text-amber-800 dark:text-amber-400 uppercase">Respuesta del Estudiante</span>
                            <span className="text-xs text-muted-foreground">Enviado a las {attempt.submittedAt}</span>
                          </div>
                          {answer.userAudioUrl ? (
                            <div className="mt-2">
                              <p className="text-sm text-muted-foreground mb-2">Grabación de audio:</p>
                              <audio controls className="w-full">
                                <source src={answer.userAudioUrl} />
                                Tu navegador no soporta el elemento de audio.
                              </audio>
                            </div>
                          ) : (
                            <p className="text-foreground italic leading-relaxed whitespace-pre-wrap">
                              {answer.userAnswer || '(Sin respuesta)'}
                            </p>
                          )}
                        </div>
                      )}

                      {answer.needsReview && (
                        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                          <div className="flex items-center gap-2 mb-4">
                            <FileText className="h-5 w-5 text-primary" />
                            <h4 className="font-bold text-foreground">Calificación y Retroalimentación del Profesor</h4>
                          </div>

                          <div className="grid md:grid-cols-3 gap-6">
                            <div className="md:col-span-2">
                              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                                Retroalimentación Cualitativa
                              </label>
                              <Textarea
                                placeholder="Agregar retroalimentación para el estudiante..."
                                value={localGrades[answer.id]?.feedback ?? answer.feedback ?? ''}
                                onChange={(e) => updateLocalGrade(answer.id, 'feedback', e.target.value)}
                                className="min-h-[120px]"
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                                Ajuste de Puntaje
                              </label>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  min={0}
                                  max={answer.maxPoints}
                                  value={localGrades[answer.id]?.points ?? answer.pointsEarned}
                                  onChange={(e) => updateLocalGrade(answer.id, 'points', parseFloat(e.target.value) || 0)}
                                  className="w-20"
                                />
                                <span className="text-muted-foreground">/ {answer.maxPoints}</span>
                              </div>
                              <div className="flex gap-2 mt-3">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => updateLocalGrade(answer.id, 'points', answer.maxPoints)}
                                >
                                  Excelente
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => updateLocalGrade(answer.id, 'points', answer.maxPoints * 0.5)}
                                >
                                  Más detalle
                                </Button>
                              </div>
                            </div>
                          </div>

                          <div className="flex justify-end mt-4">
                            <Button
                              onClick={() => handleSaveGrade(answer.id)}
                              disabled={isSaving}
                              className="flex items-center gap-2"
                            >
                              <Save className="h-4 w-4" />
                              {isSaving ? 'Guardando...' : 'Guardar Calificación'}
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Solo mostrar bloque de resultado si NO tiene multipleChoiceDetails (ya se muestra arriba) */}
                      {!answer.needsReview && answer.isAutoGraded && !answer.multipleChoiceDetails && (
                        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                          <div className={cn(
                            "p-4 rounded-lg",
                            answer.isCorrect 
                              ? "bg-green-50 dark:bg-green-900/20 border border-green-200"
                              : "bg-red-50 dark:bg-red-900/20 border border-red-200"
                          )}>
                            <div className="flex items-center gap-2 mb-2">
                              {answer.isCorrect ? (
                                <CheckCircle className="h-5 w-5 text-green-600" />
                              ) : (
                                <XCircle className="h-5 w-5 text-red-600" />
                              )}
                              <span className="font-bold text-foreground">
                                {answer.isCorrect ? 'Respuesta Correcta' : 'Respuesta Incorrecta'}
                              </span>
                            </div>
                            {answer.correctAnswer && !answer.isCorrect && (
                              <div className="text-sm text-muted-foreground">
                                <strong>Respuesta correcta:</strong>
                                <p className="whitespace-pre-wrap mt-1">{answer.correctAnswer}</p>
                              </div>
                            )}
                          </div>

                          <div className="mt-4">
                            <button 
                              className="text-sm text-primary hover:underline flex items-center gap-1"
                              onClick={() => {
                                updateLocalGrade(answer.id, 'points', answer.pointsEarned)
                                updateLocalGrade(answer.id, 'feedback', answer.feedback || '')
                                toast.info('Ahora puedes modificar el puntaje y agregar comentarios')
                              }}
                            >
                              <AlertCircle className="h-4 w-4" />
                              Anular Puntaje o Agregar Comentario
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="bg-white dark:bg-[#1a2632] rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 text-center">
                <p className="text-muted-foreground">No hay preguntas para mostrar</p>
              </div>
            )}

            <div ref={navigationContainerRef} className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 pt-6">
              <Button
                variant="ghost"
                onClick={() => {
                  // Encontrar el índice navegable anterior desde la posición actual
                  const currentNavIndex = navigationIndices.findIndex(index => index === currentQuestionIndex)
                  if (currentNavIndex > 0) {
                    setCurrentQuestionWithScroll(navigationIndices[currentNavIndex - 1])
                  } else if (currentNavIndex === -1) {
                    // Si currentQuestionIndex no está en navigationIndices (bloque informativo),
                    // encontrar el índice navegable anterior
                    const prevNavIndex = navigationIndices.findIndex(index => index > currentQuestionIndex) - 1
                    if (prevNavIndex >= 0) {
                      setCurrentQuestionWithScroll(navigationIndices[prevNavIndex])
                    }
                  }
                }}
                disabled={navigationIndices.length === 0 || 
                  navigationIndices.findIndex(index => index === currentQuestionIndex) <= 0}
                className="flex items-center gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>

              <span className="text-sm text-muted-foreground">
                {currentGroupAnswers.length > 1 
                  ? `Grupo de ${currentGroupAnswers.length} preguntas`
                  : `Pregunta ${navigatorQuestions.findIndex(q => q.navIndex === currentQuestionIndex) + 1} de ${navigatorQuestions.length}`
                }
              </span>

              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  onClick={() => {
                    // Encontrar el siguiente índice navegable desde la posición actual
                    const currentNavIndex = navigationIndices.findIndex(index => index === currentQuestionIndex)
                    if (currentNavIndex >= 0 && currentNavIndex < navigationIndices.length - 1) {
                      setCurrentQuestionWithScroll(navigationIndices[currentNavIndex + 1])
                    } else if (currentNavIndex === -1) {
                      // Si currentQuestionIndex no está en navigationIndices (bloque informativo),
                      // encontrar el siguiente índice navegable
                      const nextNavIndex = navigationIndices.findIndex(index => index > currentQuestionIndex)
                      if (nextNavIndex >= 0) {
                        setCurrentQuestionWithScroll(navigationIndices[nextNavIndex])
                      }
                    }
                  }}
                  disabled={navigationIndices.length === 0 || 
                    navigationIndices.findIndex(index => index === currentQuestionIndex) >= navigationIndices.length - 1}
                  className="flex items-center gap-2"
                >
                  Siguiente
                  <ChevronRight className="h-4 w-4" />
                </Button>

                <Button 
                  variant="outline"
                  onClick={async () => {
                    // Guardar todas las calificaciones locales como borrador
                    const gradesToSave = Object.entries(localGrades)
                    if (gradesToSave.length === 0) {
                      toast.info('No hay cambios para guardar')
                      return
                    }
                    setIsSaving(true)
                    try {
                      for (const [answerId, grade] of gradesToSave) {
                        await onSaveGrade(answerId, grade.points, grade.feedback)
                      }
                      toast.success(`${gradesToSave.length} calificación(es) guardada(s)`)
                    } catch (error) {
                      console.error('Error saving draft:', error)
                      toast.error('Error al guardar borrador')
                    } finally {
                      setIsSaving(false)
                    }
                  }}
                  disabled={isSaving}
                >
                  {isSaving ? 'Guardando...' : 'Guardar Borrador'}
                </Button>

                <Button
                  onClick={handleFinalizeReview}
                  disabled={isFinishing || needsReview}
                  className="flex items-center gap-2"
                >
                  <Send className="h-4 w-4" />
                  {isFinishing ? 'Finalizando...' : 'Finalizar Revisión'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
