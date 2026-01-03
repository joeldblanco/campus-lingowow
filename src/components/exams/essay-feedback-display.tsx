'use client'

import { useState } from 'react'
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  BookOpen,
  MessageSquare,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Target,
  TrendingUp,
  Lightbulb,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

interface EssayGradingResult {
  score: number
  maxScore: number
  percentage: number
  passed: boolean
  feedback: {
    overall: string
    grammar: {
      score: number
      maxScore: number
      comments: string
      corrections: Array<{
        original: string
        corrected: string
        explanation: string
      }>
    }
    vocabulary: {
      score: number
      maxScore: number
      comments: string
      suggestions: string[]
    }
    coherence: {
      score: number
      maxScore: number
      comments: string
    }
    taskCompletion: {
      score: number
      maxScore: number
      comments: string
    }
  }
  wordCount: number
  estimatedLevel: string
  strengths: string[]
  areasToImprove: string[]
}

interface EssayFeedbackDisplayProps {
  result: EssayGradingResult
  className?: string
}

function ScoreCircle({ score, maxScore, size = 'md' }: { score: number; maxScore: number; size?: 'sm' | 'md' | 'lg' }) {
  const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0
  const circumference = 2 * Math.PI * 45
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32',
  }

  const textSizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
  }

  const getColor = () => {
    if (percentage >= 80) return 'text-green-500'
    if (percentage >= 60) return 'text-yellow-500'
    return 'text-red-500'
  }

  return (
    <div className={cn('relative', sizeClasses[size])}>
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-slate-200 dark:text-slate-700"
        />
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className={cn('transition-all duration-1000 ease-out', getColor())}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn('font-bold', textSizeClasses[size], getColor())}>
          {Math.round(percentage)}%
        </span>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {score}/{maxScore}
        </span>
      </div>
    </div>
  )
}

function CategoryScore({ 
  title, 
  icon: Icon, 
  score, 
  maxScore, 
  comments,
  children 
}: { 
  title: string
  icon: React.ElementType
  score: number
  maxScore: number
  comments: string
  children?: React.ReactNode
}) {
  const [isOpen, setIsOpen] = useState(false)
  const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0

  const getBarColor = () => {
    if (percentage >= 80) return 'bg-green-500'
    if (percentage >= 60) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <CollapsibleTrigger asChild>
          <button className="w-full">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <h4 className="font-semibold text-slate-900 dark:text-white">{title}</h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {score} / {maxScore} puntos
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-24 h-2 rounded-full bg-slate-200 dark:bg-slate-600 overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all duration-500', getBarColor())}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                {isOpen ? (
                  <ChevronUp className="h-5 w-5 text-slate-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-slate-400" />
                )}
              </div>
            </div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
            <p className="text-sm text-slate-600 dark:text-slate-300">{comments}</p>
            {children}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}

export function EssayFeedbackDisplay({ result, className }: EssayFeedbackDisplayProps) {
  const [showCorrections, setShowCorrections] = useState(false)

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header with overall score */}
      <div className="flex flex-col md:flex-row items-center gap-6 p-6 rounded-xl bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20">
        <ScoreCircle score={result.score} maxScore={result.maxScore} size="lg" />
        <div className="flex-1 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              Calificación con IA
            </h3>
          </div>
          <p className="text-slate-600 dark:text-slate-300 mb-3">
            {result.feedback.overall}
          </p>
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
            <span className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium',
              result.passed 
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            )}>
              {result.passed ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              {result.passed ? 'Aprobado' : 'Necesita mejorar'}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-medium dark:bg-blue-900/30 dark:text-blue-400">
              <Target className="h-4 w-4" />
              Nivel: {result.estimatedLevel}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-sm font-medium dark:bg-slate-700 dark:text-slate-300">
              <BookOpen className="h-4 w-4" />
              {result.wordCount} palabras
            </span>
          </div>
        </div>
      </div>

      {/* Category Scores */}
      <div className="grid gap-4">
        <CategoryScore
          title="Gramática y Precisión"
          icon={BookOpen}
          score={result.feedback.grammar.score}
          maxScore={result.feedback.grammar.maxScore}
          comments={result.feedback.grammar.comments}
        >
          {result.feedback.grammar.corrections.length > 0 && (
            <div className="mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCorrections(!showCorrections)}
                className="mb-3"
              >
                {showCorrections ? 'Ocultar' : 'Ver'} correcciones ({result.feedback.grammar.corrections.length})
              </Button>
              {showCorrections && (
                <div className="space-y-3">
                  {result.feedback.grammar.corrections.map((correction, index) => (
                    <div
                      key={index}
                      className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                    >
                      <div className="flex items-start gap-2 mb-2">
                        <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-red-700 dark:text-red-400 line-through">
                          {correction.original}
                        </span>
                      </div>
                      <div className="flex items-start gap-2 mb-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-green-700 dark:text-green-400 font-medium">
                          {correction.corrected}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 ml-6">
                        {correction.explanation}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CategoryScore>

        <CategoryScore
          title="Vocabulario"
          icon={MessageSquare}
          score={result.feedback.vocabulary.score}
          maxScore={result.feedback.vocabulary.maxScore}
          comments={result.feedback.vocabulary.comments}
        >
          {result.feedback.vocabulary.suggestions.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                Sugerencias de vocabulario:
              </p>
              <div className="flex flex-wrap gap-2">
                {result.feedback.vocabulary.suggestions.map((suggestion, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 text-xs rounded-md bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                  >
                    {suggestion}
                  </span>
                ))}
              </div>
            </div>
          )}
        </CategoryScore>

        <CategoryScore
          title="Coherencia y Organización"
          icon={TrendingUp}
          score={result.feedback.coherence.score}
          maxScore={result.feedback.coherence.maxScore}
          comments={result.feedback.coherence.comments}
        />

        <CategoryScore
          title="Cumplimiento de la Tarea"
          icon={Target}
          score={result.feedback.taskCompletion.score}
          maxScore={result.feedback.taskCompletion.maxScore}
          comments={result.feedback.taskCompletion.comments}
        />
      </div>

      {/* Strengths and Areas to Improve */}
      <div className="grid md:grid-cols-2 gap-4">
        {result.strengths.length > 0 && (
          <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <h4 className="font-semibold text-green-800 dark:text-green-400">Fortalezas</h4>
            </div>
            <ul className="space-y-2">
              {result.strengths.map((strength, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-green-700 dark:text-green-300">
                  <span className="text-green-500 mt-1">•</span>
                  {strength}
                </li>
              ))}
            </ul>
          </div>
        )}

        {result.areasToImprove.length > 0 && (
          <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="h-5 w-5 text-amber-600" />
              <h4 className="font-semibold text-amber-800 dark:text-amber-400">Áreas a Mejorar</h4>
            </div>
            <ul className="space-y-2">
              {result.areasToImprove.map((area, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-300">
                  <span className="text-amber-500 mt-1">•</span>
                  {area}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* AI Disclaimer */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
        <AlertTriangle className="h-5 w-5 text-slate-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Esta calificación fue generada automáticamente por IA (Gemini). 
          Tu profesor puede revisar y ajustar la calificación si es necesario.
        </p>
      </div>
    </div>
  )
}
