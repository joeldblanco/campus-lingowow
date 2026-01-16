'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
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
import { ChevronLeft, ChevronRight, Flag, Send, Loader2 } from 'lucide-react'
import { ExamSectionWithQuestions } from '@/types/exam'
import { saveExamAnswer, completePlacementTest } from '@/lib/actions/exams'
import { toast } from 'sonner'
import { ExamTimer } from '@/components/exams/student/exam-timer'
import { QuestionNavigator } from '@/components/exams/student/question-navigator'
import { ExamQuestionCard } from '@/components/exams/student/exam-question-card'
import { JsonValue } from '@prisma/client/runtime/library'

interface PlacementTestViewerProps {
  examId: string
  attemptId: string
  title: string
  sections: ExamSectionWithQuestions[]
  timeLimit: number
  startedAt: string
}

function parseJsonOptions(options: JsonValue | null | undefined): string[] | null {
  if (!options) return null
  if (Array.isArray(options)) return options as string[]
  if (typeof options === 'string') {
    try {
      const parsed = JSON.parse(options)
      return Array.isArray(parsed) ? parsed : null
    } catch {
      return null
    }
  }
  return null
}

export function PlacementTestViewer({
  examId,
  attemptId,
  title,
  sections,
  timeLimit,
  startedAt,
}: PlacementTestViewerProps) {
  const router = useRouter()
  const [answers, setAnswers] = useState<Record<string, unknown>>({})
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<string>>(new Set())
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [isSaving, setIsSaving] = useState(false)
  const [showSubmitDialog, setShowSubmitDialog] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const allQuestions = sections.flatMap((section) => 
    section.questions.map((q) => ({
      ...q,
      sectionTitle: section.title,
      options: parseJsonOptions(q.options),
    }))
  )
  const totalQuestions = allQuestions.length
  const currentQuestion = allQuestions[currentQuestionIndex]
  const answeredCount = Object.keys(answers).length
  const progress = (answeredCount / totalQuestions) * 100

  const handleAnswerChange = useCallback(async (questionId: string, answer: unknown) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }))
    
    setIsSaving(true)
    try {
      await saveExamAnswer(attemptId, questionId, answer)
    } catch (error) {
      console.error('Error saving answer:', error)
    } finally {
      setIsSaving(false)
    }
  }, [attemptId])

  const handleToggleFlag = useCallback((questionId: string) => {
    setFlaggedQuestions((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(questionId)) {
        newSet.delete(questionId)
      } else {
        newSet.add(questionId)
      }
      return newSet
    })
  }, [])

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1)
    }
  }

  const handleNext = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      const result = await completePlacementTest(attemptId)
      
      if (result.success) {
        toast.success('¡Test completado!')
        router.push(`/placement-test/${examId}/results`)
      } else {
        toast.error(result.error || 'Error al enviar el test')
      }
    } catch (error) {
      console.error('Error submitting test:', error)
      toast.error('Error al enviar el test')
    } finally {
      setIsSubmitting(false)
      setShowSubmitDialog(false)
    }
  }

  const handleTimeUp = () => {
    toast.warning('¡Se acabó el tiempo!')
    handleSubmit()
  }

  const getQuestionStatus = (questionId: string): 'answered' | 'flagged' | 'current' | 'unanswered' => {
    if (currentQuestion?.id === questionId) return 'current'
    if (flaggedQuestions.has(questionId)) return 'flagged'
    if (answers[questionId] !== undefined) return 'answered'
    return 'unanswered'
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="sticky top-0 z-50 bg-background border-b shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold">{title}</h1>
              <p className="text-sm text-muted-foreground">Test de Clasificación</p>
            </div>
            
            <div className="flex items-center gap-4">
              <ExamTimer 
                timeLimit={timeLimit} 
                startedAt={startedAt}
                onTimeUp={handleTimeUp}
              />
              
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {answeredCount}/{totalQuestions} respondidas
                </Badge>
                {isSaving && (
                  <Badge variant="secondary" className="animate-pulse">
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Guardando...
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          <Progress value={progress} className="h-1 mt-3" />
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            {currentQuestion && (
              <Card>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">{currentQuestion.sectionTitle}</Badge>
                    <span className="text-sm text-muted-foreground">
                      Pregunta {currentQuestionIndex + 1} de {totalQuestions}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ExamQuestionCard
                    questionNumber={currentQuestionIndex + 1}
                    question={currentQuestion}
                    answer={answers[currentQuestion.id]}
                    onAnswerChange={(answer) => handleAnswerChange(currentQuestion.id, answer)}
                    isFlagged={flaggedQuestions.has(currentQuestion.id)}
                    onToggleFlag={() => handleToggleFlag(currentQuestion.id)}
                  />
                </CardContent>
              </Card>
            )}

            <div className="flex items-center justify-between mt-6">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentQuestionIndex === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Anterior
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => currentQuestion && handleToggleFlag(currentQuestion.id)}
                >
                  <Flag className={`h-4 w-4 mr-2 ${flaggedQuestions.has(currentQuestion?.id || '') ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                  {flaggedQuestions.has(currentQuestion?.id || '') ? 'Marcada' : 'Marcar'}
                </Button>
              </div>

              {currentQuestionIndex < totalQuestions - 1 ? (
                <Button onClick={handleNext}>
                  Siguiente
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button 
                  onClick={() => setShowSubmitDialog(true)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Finalizar Test
                </Button>
              )}
            </div>
          </div>

          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Navegador de Preguntas</CardTitle>
              </CardHeader>
              <CardContent>
                <QuestionNavigator
                  questions={allQuestions.map((q, idx) => ({
                    id: q.id,
                    status: getQuestionStatus(q.id),
                    navIndex: idx,
                  }))}
                  onNavigate={setCurrentQuestionIndex}
                />
                
                <div className="mt-4 space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-green-500" />
                    <span>Respondida</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-yellow-500" />
                    <span>Marcada para revisar</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-primary" />
                    <span>Actual</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded border-2 border-muted-foreground" />
                    <span>Sin responder</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Finalizar el test?</AlertDialogTitle>
            <AlertDialogDescription>
              Has respondido {answeredCount} de {totalQuestions} preguntas.
              {answeredCount < totalQuestions && (
                <span className="block mt-2 text-yellow-600">
                  ⚠️ Tienes {totalQuestions - answeredCount} pregunta(s) sin responder.
                </span>
              )}
              {flaggedQuestions.size > 0 && (
                <span className="block mt-2 text-yellow-600">
                  ⚠️ Tienes {flaggedQuestions.size} pregunta(s) marcada(s) para revisar.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Revisar respuestas</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                'Finalizar Test'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
