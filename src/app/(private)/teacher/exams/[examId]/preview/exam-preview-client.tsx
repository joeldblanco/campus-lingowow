'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Clock, Target, Award, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { QuestionNavigator, QuestionStatus } from '@/components/exams/student/question-navigator'
import { ExamQuestionCard, ExamQuestionData } from '@/components/exams/student/exam-question-card'
import { QuestionType } from '@prisma/client'

interface ExamSection {
  id: string
  title: string
  description?: string | null
  questions: {
    id: string
    type: QuestionType
    question: string
    options?: string[] | null
    multipleChoiceItems?: { id: string; question: string; options: { id: string; text: string }[] }[] | null
    originalBlockType?: string | null
    blockData?: {
      url?: string
      content?: string
      title?: string
      instruction?: string
      timeLimit?: number
      aiGrading?: boolean
      maxReplays?: number
    } | null
    correctAnswer: unknown
    explanation?: string | null
    points: number
    minLength?: number | null
    maxLength?: number | null
  }[]
}

interface ExamPreviewClientProps {
  examId: string
  title: string
  description: string
  courseName?: string
  sections: ExamSection[]
  timeLimit: number
  passingScore: number
  totalPoints: number
  questionCount: number
}

export function ExamPreviewClient({
  title,
  description,
  courseName,
  sections,
  timeLimit,
  passingScore,
  totalPoints,
  questionCount,
}: ExamPreviewClientProps) {
  const router = useRouter()
  const [answers, setAnswers] = useState<Record<string, unknown>>({})
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [showFeedback, setShowFeedback] = useState(false)

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

  const questionStatuses = useMemo(() => {
    return allQuestions.map((q, index) => {
      const hasAnswer = answers[q.id] !== null && answers[q.id] !== undefined && answers[q.id] !== ''
      
      let status: QuestionStatus = 'unanswered'
      if (index === currentQuestionIndex) {
        status = 'current'
      } else if (hasAnswer) {
        status = 'answered'
      }
      
      return { id: q.id, status }
    })
  }, [allQuestions, answers, currentQuestionIndex])

  const handleAnswerChange = async (answer: unknown) => {
    if (!currentQuestion) return
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: answer
    }))
  }

  const handleNavigate = (index: number) => {
    if (index >= 0 && index < totalQuestions) {
      setCurrentQuestionIndex(index)
    }
  }

  const handlePrevious = () => {
    handleNavigate(currentQuestionIndex - 1)
  }

  const handleNext = () => {
    handleNavigate(currentQuestionIndex + 1)
  }

  const checkAnswer = (question: typeof currentQuestion) => {
    const userAnswer = answers[question.id]
    if (userAnswer === null || userAnswer === undefined || userAnswer === '') {
      return null
    }

    const correctAnswer = question.correctAnswer
    if (Array.isArray(correctAnswer)) {
      return correctAnswer.some((ca) => 
        String(ca).toLowerCase() === String(userAnswer).toLowerCase()
      )
    }
    return String(correctAnswer).toLowerCase() === String(userAnswer).toLowerCase()
  }

  const isCurrentAnswerCorrect = currentQuestion ? checkAnswer(currentQuestion) : null

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-white dark:bg-[#1a2632] border-b border-gray-200 dark:border-gray-800 px-6 py-3 shadow-sm">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-foreground text-lg font-bold leading-tight">{title}</h2>
                <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-300">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Modo Previsualización
                </Badge>
              </div>
              {courseName && (
                <p className="text-muted-foreground text-xs font-medium">{courseName}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant={showFeedback ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowFeedback(!showFeedback)}
            >
              {showFeedback ? 'Ocultar Respuestas' : 'Mostrar Respuestas'}
            </Button>
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

            {currentQuestion && (
              <div className="space-y-4">
                <ExamQuestionCard
                  questionNumber={currentQuestionIndex + 1}
                  question={currentQuestion as ExamQuestionData}
                  answer={answers[currentQuestion.id]}
                  onAnswerChange={handleAnswerChange}
                  isFlagged={false}
                  onToggleFlag={() => {}}
                />

                {showFeedback && answers[currentQuestion.id] !== undefined && (
                  <Card className={isCurrentAnswerCorrect ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-red-500 bg-red-50 dark:bg-red-900/20'}>
                    <CardHeader className="py-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        {isCurrentAnswerCorrect ? (
                          <>
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                            <span className="text-green-700 dark:text-green-400">Respuesta Correcta</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-5 h-5 text-red-600" />
                            <span className="text-red-700 dark:text-red-400">Respuesta Incorrecta</span>
                          </>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="py-3 space-y-2">
                      <p className="text-sm">
                        <strong>Respuesta correcta:</strong>{' '}
                        {Array.isArray(currentQuestion.correctAnswer)
                          ? currentQuestion.correctAnswer.join(', ')
                          : String(currentQuestion.correctAnswer)}
                      </p>
                      {currentQuestion.explanation && (
                        <p className="text-sm text-muted-foreground">
                          <strong>Explicación:</strong> {currentQuestion.explanation}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
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
                {currentQuestionIndex < totalQuestions - 1 && (
                  <Button
                    variant="secondary"
                    onClick={handleNext}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2"
                  >
                    Siguiente
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
                <Link href="/teacher/courses">
                  <Button variant="outline">
                    Volver a Cursos
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          <aside className="lg:col-span-4 w-full lg:max-w-[360px] space-y-6">
            <div className="sticky top-24 space-y-6">
              <Card className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
                <CardContent className="py-4">
                  <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400 mb-2">
                    <AlertTriangle className="w-5 h-5" />
                    <span className="font-semibold">Modo Previsualización</span>
                  </div>
                  <p className="text-sm text-yellow-600 dark:text-yellow-500">
                    Las respuestas no se guardan. Este modo es solo para revisar el examen.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="py-4">
                  <CardTitle className="text-base">Información del Examen</CardTitle>
                </CardHeader>
                <CardContent className="py-2 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      Tiempo límite
                    </span>
                    <span className="font-medium">{timeLimit} min</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Target className="w-4 h-4" />
                      Puntaje mínimo
                    </span>
                    <span className="font-medium">{passingScore}%</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Award className="w-4 h-4" />
                      Puntos totales
                    </span>
                    <span className="font-medium">{totalPoints} pts</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="py-4">
                  <CardTitle className="text-base">Progreso</CardTitle>
                </CardHeader>
                <CardContent className="py-2">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Respondidas</span>
                    <span className="font-medium">{answeredCount}/{questionCount}</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${(answeredCount / questionCount) * 100}%` }}
                    />
                  </div>
                </CardContent>
              </Card>

              <QuestionNavigator
                questions={questionStatuses}
                currentIndex={currentQuestionIndex}
                onNavigate={handleNavigate}
              />
            </div>
          </aside>
        </div>
      </main>
    </div>
  )
}
