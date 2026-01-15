'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  CheckCircle, 
  XCircle, 
  Timer, 
  Target, 
  Zap, 
  ArrowRight,
  Lightbulb,
  Play,
  ChevronDown
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface QuestionResult {
  id: string
  questionNumber: number
  type: string
  category?: string
  question: string
  userAnswer: string | null
  correctAnswer: string
  isCorrect: boolean
  pointsEarned: number
  maxPoints: number
  explanation?: string | null
  audioUrl?: string | null
  needsReview?: boolean
}

interface ExamResultsProps {
  examTitle: string
  examDescription?: string
  score: number
  totalPoints: number
  maxPoints: number
  correctAnswers: number
  totalQuestions: number
  timeSpent: number
  passed: boolean
  xpEarned?: number
  questionResults: QuestionResult[]
  nextLessonUrl?: string
  dashboardUrl?: string
}

export function ExamResults({
  examTitle,
  examDescription,
  score,
  correctAnswers,
  totalQuestions,
  timeSpent,
  passed,
  xpEarned = 0,
  questionResults,
  nextLessonUrl,
  dashboardUrl = '/dashboard'
}: ExamResultsProps) {
  const router = useRouter()
  const [filter, setFilter] = useState<'all' | 'correct' | 'incorrect'>('all')

  const filteredResults = questionResults.filter((result) => {
    if (filter === 'correct') return result.isCorrect
    if (filter === 'incorrect') return !result.isCorrect
    return true
  })

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }

  const getAccuracyLabel = () => {
    if (score >= 90) return 'Excelente'
    if (score >= 70) return 'Alta'
    if (score >= 50) return 'Media'
    return 'Baja'
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-white dark:bg-[#1a2632] border-b border-gray-200 dark:border-gray-800 px-6 py-3 shadow-sm">
        <div className="max-w-[1024px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4 text-foreground">
            <div className="size-8 flex items-center justify-center text-primary">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
              </svg>
            </div>
            <h2 className="text-foreground text-xl font-bold leading-tight tracking-tight">Lingowow</h2>
          </div>
          <nav className="hidden md:flex flex-1 justify-center gap-8">
            <Link className="text-muted-foreground text-sm font-medium hover:text-primary transition-colors" href="/dashboard">Dashboard</Link>
            <Link className="text-primary text-sm font-bold" href="/my-courses">Cursos</Link>
            <Link className="text-muted-foreground text-sm font-medium hover:text-primary transition-colors" href="/messages">Comunidad</Link>
          </nav>
          <div className="flex items-center gap-4">
            {xpEarned > 0 && (
              <div className="hidden sm:flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Zap className="h-5 w-5 text-yellow-500" />
                <span>+{xpEarned} XP</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-[1024px] mx-auto w-full px-6 py-8 md:py-10">
        <div className="mb-10 flex flex-col gap-6 text-center">
          <div className="flex flex-col items-center gap-2">
            <div className={cn(
              "inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold",
              passed 
                ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
            )}>
              {passed ? (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Examen Aprobado
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4" />
                  Examen No Aprobado
                </>
              )}
            </div>
            <h1 className="text-foreground text-3xl md:text-4xl font-bold leading-tight tracking-tight">
              Resultados: {examTitle}
            </h1>
            {examDescription && (
              <p className="text-muted-foreground text-lg">{examDescription}</p>
            )}
          </div>

          <div className="bg-white dark:bg-[#1a2632] rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 md:p-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="relative size-40 md:size-48 flex items-center justify-center">
                <svg className="size-full -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-gray-100 dark:text-gray-700"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                  />
                  <path
                    className={cn(
                      passed ? "text-primary" : "text-red-500"
                    )}
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeDasharray={`${score}, 100`}
                    strokeWidth="3"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl md:text-5xl font-bold text-foreground">{Math.round(score)}%</span>
                  <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide mt-1">Puntaje</span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 w-full md:w-auto flex-1">
                <div className="flex flex-col items-center md:items-start p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <span className="text-muted-foreground text-sm font-medium mb-1">Respuestas Correctas</span>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-xl md:text-2xl font-bold text-foreground">
                      {correctAnswers}<span className="text-muted-foreground text-base font-normal">/{totalQuestions}</span>
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-center md:items-start p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <span className="text-muted-foreground text-sm font-medium mb-1">Tiempo</span>
                  <div className="flex items-center gap-2">
                    <Timer className="h-5 w-5 text-blue-500" />
                    <span className="text-xl md:text-2xl font-bold text-foreground">{formatTime(timeSpent)}</span>
                  </div>
                </div>
                <div className="flex flex-col items-center md:items-start p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <span className="text-muted-foreground text-sm font-medium mb-1">Precisión</span>
                  <div className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-purple-500" />
                    <span className="text-xl md:text-2xl font-bold text-foreground">{getAccuracyLabel()}</span>
                  </div>
                </div>
                <div className="flex flex-col items-center md:items-start p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <span className="text-muted-foreground text-sm font-medium mb-1">XP Ganados</span>
                  <div className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-yellow-500" />
                    <span className="text-xl md:text-2xl font-bold text-foreground">+{xpEarned}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-center gap-4 mt-8 w-full border-t border-gray-100 dark:border-gray-800 pt-6">
              <Button
                variant="outline"
                onClick={() => setFilter(filter === 'all' ? 'incorrect' : 'all')}
                className="w-full sm:w-auto"
              >
                Revisar Preguntas
              </Button>
              {nextLessonUrl ? (
                <Button
                  onClick={() => router.push(nextLessonUrl)}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 shadow-lg shadow-primary/30"
                >
                  Ir a la Siguiente Lección
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={() => router.push(dashboardUrl)}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 shadow-lg shadow-primary/30"
                >
                  Volver al Dashboard
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-foreground">Desglose Detallado</h2>
            <div className="flex gap-2">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as 'all' | 'correct' | 'incorrect')}
                className="bg-white dark:bg-[#1a2632] border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-gray-300 focus:ring-primary focus:border-primary"
              >
                <option value="all">Todas las Preguntas</option>
                <option value="incorrect">Solo Incorrectas</option>
                <option value="correct">Solo Correctas</option>
              </select>
            </div>
          </div>

          {filteredResults.map((result) => (
            <QuestionResultCard key={result.id} result={result} />
          ))}
        </div>

        <div className="sticky bottom-6 mt-12 flex justify-end pointer-events-none">
          <div className="pointer-events-auto bg-white dark:bg-[#1a2632] p-4 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 flex items-center gap-4">
            <span className="text-sm font-medium text-muted-foreground hidden sm:block">¿Listo para continuar?</span>
            <Button
              onClick={() => router.push(nextLessonUrl || dashboardUrl)}
              className="shadow-md"
            >
              Continuar Aprendiendo
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function QuestionResultCard({ result }: { result: QuestionResult }) {
  const [expanded, setExpanded] = useState(true)

  const isPendingReview = result.needsReview === true
  
  return (
    <div className={cn(
      "bg-white dark:bg-[#1a2632] rounded-xl shadow-sm border border-l-4 overflow-hidden",
      isPendingReview
        ? "border-gray-200 dark:border-gray-700 border-l-yellow-500"
        : result.isCorrect 
          ? "border-gray-200 dark:border-gray-700 border-l-green-500"
          : "border-gray-200 dark:border-gray-700 border-l-red-500"
    )}>
      <div className="p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <span className={cn(
              "flex items-center justify-center size-8 rounded-full font-bold text-sm",
              isPendingReview
                ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400"
                : result.isCorrect 
                  ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                  : "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
            )}>
              {result.questionNumber}
            </span>
            {result.category && (
              <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs font-semibold text-muted-foreground uppercase">
                {result.category}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className={cn(
              "flex items-center gap-1 font-bold text-sm",
              isPendingReview
                ? "text-yellow-600 dark:text-yellow-400"
                : result.isCorrect 
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
            )}>
              {isPendingReview ? (
                <>
                  <Timer className="h-4 w-4" />
                  Pendiente de Revisión
                </>
              ) : result.isCorrect ? (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Correcta
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4" />
                  Incorrecta
                </>
              )}
            </span>
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
            >
              <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} />
            </button>
          </div>
        </div>

        <h3 className="text-lg font-bold text-foreground mb-4">{result.question}</h3>

        {expanded && (
          <>
            {result.audioUrl && (
              <div className="mb-4">
                <button className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-sm font-medium text-primary transition-colors">
                  <Play className="h-5 w-5" />
                  Reproducir Audio
                </button>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div className={cn(
                "p-4 rounded-lg border",
                isPendingReview
                  ? "bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-900/30"
                  : result.isCorrect
                    ? "bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-900/30"
                    : "bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900/30"
              )}>
                <span className={cn(
                  "text-xs font-bold uppercase mb-1 block",
                  isPendingReview
                    ? "text-yellow-700 dark:text-yellow-400"
                    : result.isCorrect
                      ? "text-green-700 dark:text-green-400"
                      : "text-red-700 dark:text-red-400"
                )}>
                  Tu Respuesta
                </span>
                <p className={cn(
                  "text-foreground font-medium",
                  !result.isCorrect && !isPendingReview && "line-through decoration-red-500"
                )}>
                  {result.userAnswer || '(Sin respuesta)'}
                </p>
              </div>
              {!result.isCorrect && !isPendingReview && (
                <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-900/30">
                  <span className="text-xs font-bold text-green-700 dark:text-green-400 uppercase mb-1 block">
                    Respuesta Correcta
                  </span>
                  <p className="text-foreground font-medium">{result.correctAnswer}</p>
                </div>
              )}
              {isPendingReview && (
                <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-900/30">
                  <span className="text-xs font-bold text-yellow-700 dark:text-yellow-400 uppercase mb-1 block">
                    Estado
                  </span>
                  <p className="text-foreground font-medium">{result.correctAnswer}</p>
                </div>
              )}
            </div>

            {result.explanation && (
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm text-muted-foreground">
                <span className="font-bold text-primary mb-1 flex items-center gap-1">
                  <Lightbulb className="h-4 w-4" />
                  Explicación
                </span>
                {result.explanation}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
