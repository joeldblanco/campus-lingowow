'use client'

import { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Send, Save, Info, CloudOff, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ExamTimer } from './exam-timer'
import { ExamProgress } from './exam-progress'
import { QuestionNavigator, QuestionStatus } from './question-navigator'
import { ExamQuestionCard, ExamQuestionData } from './exam-question-card'
import { ProctorWarningDialog } from '../proctoring'
import { useProctoring } from '@/hooks/use-proctoring'
import type { ProctorEventType } from '@/lib/actions/proctoring'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'

interface ExamSection {
  id: string
  title: string
  description?: string | null
  questions: ExamQuestionData[]
}

interface ProctoringConfig {
  enabled?: boolean
  requireFullscreen?: boolean
  blockCopyPaste?: boolean
  blockRightClick?: boolean
  maxWarnings?: number
}

interface ExamViewerProps {
  examId: string
  attemptId: string
  title: string
  description: string
  courseName?: string
  sections: ExamSection[]
  timeLimit: number
  startedAt: string
  initialAnswers?: Record<string, unknown>
  onSaveAnswer: (questionId: string, answer: unknown) => Promise<void>
  onSubmitExam: () => Promise<void>
  proctoring?: ProctoringConfig
}

export function ExamViewer({
  examId,
  attemptId,
  title,
  description,
  courseName,
  sections,
  timeLimit,
  startedAt,
  initialAnswers = {},
  onSaveAnswer,
  onSubmitExam,
  proctoring = {}
}: ExamViewerProps) {
  const router = useRouter()
  const [answers, setAnswers] = useState<Record<string, unknown>>(initialAnswers)
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<string>>(new Set())
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [isSaving, setIsSaving] = useState(false)
  const [showSubmitDialog, setShowSubmitDialog] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showProctorWarning, setShowProctorWarning] = useState(false)
  const [currentWarningType, setCurrentWarningType] = useState<ProctorEventType | 'max_warnings' | null>(null)

  const {
    enabled: proctoringEnabled = false,
    requireFullscreen = true,
    blockCopyPaste = true,
    blockRightClick = true,
    maxWarnings = 5
  } = proctoring

  const handleProctorViolation = useCallback((eventType: ProctorEventType, count: number) => {
    setCurrentWarningType(eventType as ProctorEventType | 'max_warnings')
    setShowProctorWarning(true)
    
    if (count >= maxWarnings) {
      setCurrentWarningType('max_warnings')
    }
  }, [maxWarnings])

  const handleMaxWarningsReached = useCallback(() => {
    toast.error('Has alcanzado el límite de advertencias. Tu examen será revisado.')
  }, [])

  const {
    violationCount,
    isFullscreen,
    enterFullscreen,
    endProctoring
  } = useProctoring({
    attemptId,
    enabled: proctoringEnabled,
    requireFullscreen,
    blockCopyPaste,
    blockRightClick,
    maxWarnings,
    onViolation: handleProctorViolation,
    onMaxWarningsReached: handleMaxWarningsReached
  })

  const allQuestions = useMemo(() => {
    return sections.flatMap((section) =>
      section.questions.map((q) => ({
        ...q,
        sectionTitle: section.title
      }))
    )
  }, [sections])

  const totalQuestions = allQuestions.length
  const answeredCount = Object.keys(answers).filter(
    (key) => answers[key] !== null && answers[key] !== undefined && answers[key] !== ''
  ).length

  const currentQuestion = allQuestions[currentQuestionIndex]
  
  // Obtener todas las preguntas del grupo actual (si pertenece a un grupo)
  const currentGroupQuestions = useMemo(() => {
    // Si no hay pregunta actual, retornar array vacío
    if (!currentQuestion) return []
    
    const currentGroupId = (currentQuestion as typeof currentQuestion & { groupId?: string | null }).groupId
    if (!currentGroupId) return [currentQuestion]
    
    return allQuestions.filter(q => 
      (q as typeof q & { groupId?: string | null }).groupId === currentGroupId
    )
  }, [currentQuestion, allQuestions])

  const questionStatuses = useMemo(() => {
    return allQuestions.map((q, index) => {
      const hasAnswer = answers[q.id] !== null && answers[q.id] !== undefined && answers[q.id] !== ''
      const isFlagged = flaggedQuestions.has(q.id)
      
      let status: QuestionStatus = 'unanswered'
      if (index === currentQuestionIndex) {
        status = 'current'
      } else if (isFlagged) {
        status = 'flagged'
      } else if (hasAnswer) {
        status = 'answered'
      }
      
      return { id: q.id, status }
    })
  }, [allQuestions, answers, flaggedQuestions, currentQuestionIndex])

  const handleAnswerChange = useCallback(async (answer: unknown) => {
    if (!currentQuestion) return

    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: answer
    }))

    setIsSaving(true)
    try {
      await onSaveAnswer(currentQuestion.id, answer)
    } catch (error) {
      console.error('Error saving answer:', error)
      toast.error('Error al guardar respuesta')
    } finally {
      setIsSaving(false)
    }
  }, [currentQuestion, onSaveAnswer])

  const handleToggleFlag = useCallback(() => {
    if (!currentQuestion) return
    
    setFlaggedQuestions((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(currentQuestion.id)) {
        newSet.delete(currentQuestion.id)
      } else {
        newSet.add(currentQuestion.id)
      }
      return newSet
    })
  }, [currentQuestion])

  const handleNavigate = useCallback((index: number) => {
    if (index >= 0 && index < totalQuestions) {
      setCurrentQuestionIndex(index)
    }
  }, [totalQuestions])

  const handlePrevious = useCallback(() => {
    handleNavigate(currentQuestionIndex - 1)
  }, [currentQuestionIndex, handleNavigate])

  const handleNext = useCallback(() => {
    handleNavigate(currentQuestionIndex + 1)
  }, [currentQuestionIndex, handleNavigate])

  const handleTimeUp = useCallback(async () => {
    toast.warning('¡El tiempo se ha agotado! Enviando examen...')
    setIsSubmitting(true)
    try {
      await onSubmitExam()
      toast.success('Examen enviado correctamente')
      router.push(`/exams/${examId}/${attemptId}/results`)
    } catch (error) {
      console.error('Error submitting exam:', error)
      toast.error('Error al enviar el examen')
    } finally {
      setIsSubmitting(false)
    }
  }, [onSubmitExam, router, examId, attemptId])

  const handleSubmitExam = useCallback(async () => {
    setIsSubmitting(true)
    try {
      if (proctoringEnabled) {
        await endProctoring()
      }
      await onSubmitExam()
      toast.success('Examen enviado correctamente')
      router.push(`/exams/${examId}/${attemptId}/results`)
    } catch (error) {
      console.error('Error submitting exam:', error)
      toast.error('Error al enviar el examen')
    } finally {
      setIsSubmitting(false)
      setShowSubmitDialog(false)
    }
  }, [onSubmitExam, router, examId, attemptId, proctoringEnabled, endProctoring])

  const unansweredCount = totalQuestions - answeredCount

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-white dark:bg-[#1a2632] border-b border-gray-200 dark:border-gray-800 px-6 py-3 shadow-sm">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="size-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div>
              <h2 className="text-foreground text-lg font-bold leading-tight">{title}</h2>
              {courseName && (
                <p className="text-muted-foreground text-xs font-medium">{courseName}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-6">
            {proctoringEnabled && (
              <div className={`hidden md:flex items-center gap-2 text-sm px-3 py-1.5 rounded-full ${
                violationCount > 0 
                  ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                  : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
              }`}>
                <ShieldAlert className="h-4 w-4" />
                <span>{isFullscreen ? 'Proctoring Activo' : 'Sin Pantalla Completa'}</span>
                {violationCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 bg-yellow-200 dark:bg-yellow-800 rounded text-xs font-bold">
                    {violationCount}
                  </span>
                )}
              </div>
            )}
            <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
              {isSaving ? (
                <>
                  <CloudOff className="h-4 w-4 animate-pulse" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Guardado</span>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-[1400px] mx-auto p-4 md:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 flex flex-col gap-8 pb-20">
            <div className="flex flex-col gap-2">
              <h1 className="text-2xl font-bold text-foreground">
                {currentQuestion?.sectionTitle || 'Sección'}
              </h1>
              <p className="text-muted-foreground">{description}</p>
            </div>

            {/* Renderizar preguntas agrupadas juntas o pregunta individual */}
            {currentGroupQuestions.length > 1 ? (
              <div className="space-y-4 p-4 bg-muted/20 rounded-xl border-2 border-primary/20">
                <div className="flex items-center gap-2 text-sm text-primary font-medium mb-2">
                  <span>Grupo de {currentGroupQuestions.length} elementos</span>
                </div>
                {currentGroupQuestions.map((q) => (
                  <ExamQuestionCard
                    key={q.id}
                    questionNumber={allQuestions.findIndex(aq => aq.id === q.id) + 1}
                    question={q}
                    answer={answers[q.id]}
                    onAnswerChange={(answer) => {
                      setAnswers(prev => ({ ...prev, [q.id]: answer }))
                      onSaveAnswer(q.id, answer)
                    }}
                    isFlagged={flaggedQuestions.has(q.id)}
                    onToggleFlag={() => {
                      setFlaggedQuestions(prev => {
                        const newSet = new Set(prev)
                        if (newSet.has(q.id)) {
                          newSet.delete(q.id)
                        } else {
                          newSet.add(q.id)
                        }
                        return newSet
                      })
                    }}
                  />
                ))}
              </div>
            ) : currentQuestion && (
              <ExamQuestionCard
                questionNumber={currentQuestionIndex + 1}
                question={currentQuestion}
                answer={answers[currentQuestion.id]}
                onAnswerChange={handleAnswerChange}
                isFlagged={flaggedQuestions.has(currentQuestion.id)}
                onToggleFlag={handleToggleFlag}
              />
            )}

            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="ghost"
                onClick={handlePrevious}
                disabled={currentQuestionIndex === 0}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Anterior
              </Button>
              <div className="flex gap-4 w-full sm:w-auto">
                {currentQuestionIndex < totalQuestions - 1 ? (
                  <Button
                    variant="secondary"
                    onClick={handleNext}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2"
                  >
                    Siguiente
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    onClick={() => setShowSubmitDialog(true)}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 shadow-lg shadow-primary/30"
                  >
                    <Send className="h-4 w-4" />
                    Enviar Examen
                  </Button>
                )}
              </div>
            </div>
          </div>

          <aside className="lg:col-span-4 w-full lg:max-w-[360px] space-y-6">
            <div className="sticky top-24 space-y-6">
              <ExamTimer
                timeLimit={timeLimit}
                startedAt={startedAt}
                onTimeUp={handleTimeUp}
              />

              <ExamProgress
                answeredCount={answeredCount}
                totalQuestions={totalQuestions}
              />

              <QuestionNavigator
                questions={questionStatuses}
                currentIndex={currentQuestionIndex}
                onNavigate={handleNavigate}
              />

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900 rounded-xl p-4 flex items-start gap-3">
                <Info className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-foreground mb-1">¿Necesitas ayuda?</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Puedes marcar preguntas para revisar después. Si tienes problemas técnicos, contacta al soporte.
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>

      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Enviar examen?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Estás a punto de enviar tu examen. Esta acción no se puede deshacer.</p>
              {unansweredCount > 0 && (
                <p className="text-yellow-600 font-medium">
                  ⚠️ Tienes {unansweredCount} pregunta(s) sin responder.
                </p>
              )}
              {flaggedQuestions.size > 0 && (
                <p className="text-yellow-600 font-medium">
                  ⚠️ Tienes {flaggedQuestions.size} pregunta(s) marcadas para revisar.
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSubmitExam}
              disabled={isSubmitting}
              className="bg-primary hover:bg-primary/90"
            >
              {isSubmitting ? 'Enviando...' : 'Confirmar envío'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {proctoringEnabled && (
        <ProctorWarningDialog
          isOpen={showProctorWarning}
          onClose={() => setShowProctorWarning(false)}
          warningType={currentWarningType}
          violationCount={violationCount}
          maxWarnings={maxWarnings}
          onEnterFullscreen={enterFullscreen}
        />
      )}
    </div>
  )
}
