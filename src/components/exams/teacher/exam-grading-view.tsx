'use client'

import { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  FileText,
  Save,
  Send,
  Bell
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface StudentInfo {
  id: string
  name: string
  email: string
  score: number
}

interface ExamAttemptInfo {
  id: string
  attemptNumber: number
  submittedAt: string
  status: 'PENDING_REVIEW' | 'COMPLETED' | 'IN_PROGRESS'
}

interface QuestionAnswer {
  id: string
  questionId: string
  questionNumber: number
  questionType: string
  questionText: string
  category?: string
  maxPoints: number
  userAnswer: string | null
  correctAnswer?: string
  isCorrect: boolean | null
  pointsEarned: number
  needsReview: boolean
  feedback?: string | null
  isAutoGraded: boolean
  groupId?: string | null
  sectionTitle?: string
}

interface ExamGradingViewProps {
  examId: string
  examTitle: string
  courseName: string
  students: StudentInfo[]
  selectedStudentId: string
  attempt: ExamAttemptInfo
  totalScore: number
  maxScore: number
  answers: QuestionAnswer[]
  onSelectStudent: (studentId: string) => void
  onSelectAttempt: (attemptId: string) => void
  onSaveGrade: (answerId: string, pointsEarned: number, feedback: string) => Promise<void>
  onFinalizeReview: () => Promise<void>
  breadcrumbs?: { label: string; href: string }[]
}

export function ExamGradingView({
  students,
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
  const [localGrades, setLocalGrades] = useState<Record<string, { points: number; feedback: string }>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [isFinishing, setIsFinishing] = useState(false)

  const currentAnswer = answers[currentQuestionIndex]
  const pendingReviewCount = answers.filter(a => a.needsReview).length
  const needsReview = pendingReviewCount > 0

  // Obtener todas las preguntas del grupo actual (si pertenece a un grupo)
  const currentGroupAnswers = useMemo(() => {
    if (!currentAnswer) return []
    
    const currentGroupId = currentAnswer.groupId
    if (!currentGroupId) return [currentAnswer]
    
    return answers.filter(a => a.groupId === currentGroupId)
  }, [currentAnswer, answers])

  // Calcular índices de navegación (primer índice de cada grupo o pregunta individual)
  const navigationIndices = useMemo(() => {
    const indices: number[] = []
    const processedGroupIds = new Set<string>()
    
    answers.forEach((a, index) => {
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

  const handleSaveGrade = useCallback(async (answerId: string) => {
    const grade = localGrades[answerId]
    if (!grade) return

    setIsSaving(true)
    try {
      await onSaveGrade(answerId, grade.points, grade.feedback)
      toast.success('Calificación guardada')
    } catch (error) {
      console.error('Error saving grade:', error)
      toast.error('Error al guardar calificación')
    } finally {
      setIsSaving(false)
    }
  }, [localGrades, onSaveGrade])

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

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-white dark:bg-[#1a2632] border-b border-gray-200 dark:border-gray-800 px-6 py-3 shadow-sm">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="size-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
              <FileText className="h-5 w-5" />
            </div>
            <h2 className="text-foreground text-lg font-bold">Portal del Profesor</h2>
          </div>
          <nav className="hidden md:flex flex-1 justify-center gap-8">
            <Link className="text-muted-foreground text-sm font-medium hover:text-primary transition-colors" href="/teacher/dashboard">Dashboard</Link>
            <Link className="text-muted-foreground text-sm font-medium hover:text-primary transition-colors" href="/teacher/classes">Clases</Link>
            <Link className="text-primary text-sm font-bold" href="/teacher/grading">Calificaciones</Link>
            <Link className="text-muted-foreground text-sm font-medium hover:text-primary transition-colors" href="/teacher/reports">Reportes</Link>
          </nav>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {pendingReviewCount > 0 && (
                <span className="absolute -top-1 -right-1 size-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {pendingReviewCount}
                </span>
              )}
            </Button>
          </div>
        </div>
      </header>

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
                  {student.name} ({Math.round(student.score)}%)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1 block">Intento del Examen</label>
            <div className="h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex items-center gap-2 text-foreground min-w-[280px]">
              <span className="text-muted-foreground">📅</span>
              Intento {attempt.attemptNumber} (Enviado {attempt.submittedAt})
            </div>
          </div>

          <div className="ml-auto flex items-center gap-4">
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
                {answers.map((answer, index) => {
                  const status = getQuestionStatus(answer)
                  const isCurrent = index === currentQuestionIndex
                  return (
                    <button
                      key={answer.id}
                      onClick={() => setCurrentQuestionIndex(index)}
                      className={cn(
                        "aspect-square flex items-center justify-center rounded-lg text-sm font-bold transition-colors",
                        isCurrent && "ring-2 ring-primary",
                        status === 'correct' && "bg-green-100 text-green-700",
                        status === 'incorrect' && "bg-red-100 text-red-700",
                        status === 'pending' && "bg-yellow-100 text-yellow-700",
                        status === 'unanswered' && "bg-gray-100 text-gray-500"
                      )}
                    >
                      {index + 1}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900 rounded-xl p-4">
              <h4 className="font-bold text-foreground text-sm mb-2">Nota del Profesor</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Este examen incluye {answers.filter(a => a.needsReview).length} pregunta(s) de ensayo que requieren calificación manual.
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
                  const answerIndex = answers.findIndex(a => a.id === answer.id)
                  return (
                    <div key={answer.id} className="bg-white dark:bg-[#1a2632] rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="flex items-center gap-3">
                          <span className="text-muted-foreground font-medium">Pregunta {answerIndex + 1}</span>
                          {answer.needsReview ? (
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                              Pendiente de Revisión
                            </Badge>
                          ) : answer.isAutoGraded ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                              Auto-calificada: {answer.isCorrect ? 'Correcta' : 'Incorrecta'}
                            </Badge>
                          ) : answer.userAnswer === null ? (
                            <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-300">
                              Sin respuesta
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

                      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900 rounded-lg p-4 mb-6">
                        <div className="flex items-start justify-between mb-2">
                          <span className="text-sm font-bold text-amber-800 dark:text-amber-400 uppercase">Respuesta del Estudiante</span>
                          <span className="text-xs text-muted-foreground">Enviado a las {attempt.submittedAt}</span>
                        </div>
                        <p className="text-foreground italic leading-relaxed">
                          &quot;{answer.userAnswer || '(Sin respuesta)'}&quot;
                        </p>
                      </div>

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

                      {!answer.needsReview && answer.isAutoGraded && (
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
                              <p className="text-sm text-muted-foreground">
                                <strong>Respuesta correcta:</strong> {answer.correctAnswer}
                              </p>
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

            <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 pt-6">
              <Button
                variant="ghost"
                onClick={() => {
                  // Encontrar el grupo actual y navegar al anterior
                  let currentNavIndex = -1
                  for (let i = 0; i < navigationIndices.length; i++) {
                    if (navigationIndices[i] <= currentQuestionIndex) {
                      currentNavIndex = i
                    } else {
                      break
                    }
                  }
                  const prevNavIndex = currentNavIndex > 0 ? currentNavIndex - 1 : -1
                  if (prevNavIndex >= 0) {
                    setCurrentQuestionIndex(navigationIndices[prevNavIndex])
                  }
                }}
                disabled={navigationIndices.length === 0 || currentQuestionIndex <= navigationIndices[0]}
                className="flex items-center gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>

              <span className="text-sm text-muted-foreground">
                {currentGroupAnswers.length > 1 
                  ? `Grupo de ${currentGroupAnswers.length} preguntas`
                  : `Pregunta ${currentQuestionIndex + 1} de ${answers.length}`
                }
              </span>

              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  onClick={() => {
                    // Encontrar el grupo actual y navegar al siguiente
                    let currentNavIndex = -1
                    for (let i = 0; i < navigationIndices.length; i++) {
                      if (navigationIndices[i] <= currentQuestionIndex) {
                        currentNavIndex = i
                      } else {
                        break
                      }
                    }
                    const nextNavIndex = currentNavIndex >= 0 && currentNavIndex < navigationIndices.length - 1 
                      ? currentNavIndex + 1 
                      : -1
                    if (nextNavIndex >= 0) {
                      setCurrentQuestionIndex(navigationIndices[nextNavIndex])
                    }
                  }}
                  disabled={navigationIndices.length === 0 || 
                    navigationIndices.findIndex(idx => idx > currentQuestionIndex) === -1}
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
