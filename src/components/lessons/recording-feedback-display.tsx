'use client'

import { cn } from '@/lib/utils'
import { CheckCircle, XCircle, AlertCircle, TrendingUp, Mic, BookOpen, MessageSquare, Zap, Target } from 'lucide-react'
import type { RecordingGradingResult } from '@/lib/services/recording-grading'

interface RecordingFeedbackDisplayProps {
  result: RecordingGradingResult
  className?: string
}

export function RecordingFeedbackDisplay({ result, className }: RecordingFeedbackDisplayProps) {
  const getScoreColor = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100
    if (percentage >= 80) return 'text-green-600 dark:text-green-400'
    if (percentage >= 60) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getScoreBg = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100
    if (percentage >= 80) return 'bg-green-100 dark:bg-green-900/30'
    if (percentage >= 60) return 'bg-yellow-100 dark:bg-yellow-900/30'
    return 'bg-red-100 dark:bg-red-900/30'
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Overall Score */}
      <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5">
        <div className="flex items-center gap-3">
          <div className={cn(
            'size-16 rounded-full flex items-center justify-center text-2xl font-bold',
            getScoreBg(result.score, result.maxScore),
            getScoreColor(result.score, result.maxScore)
          )}>
            {result.score}
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Puntaje Total</p>
            <p className="text-lg font-semibold">{result.score} / {result.maxScore}</p>
            <p className="text-xs text-muted-foreground">
              {result.percentage}% - {result.passed ? 'Aprobado' : 'Necesita mejorar'}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Nivel Estimado</p>
          <p className="text-2xl font-bold text-primary">{result.estimatedLevel}</p>
        </div>
      </div>

      {/* Transcription */}
      {result.transcription && (
        <div className="p-4 rounded-lg bg-muted/50 border">
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            <Mic className="h-4 w-4" />
            Transcripción
          </h4>
          <p className="text-sm italic text-muted-foreground">&ldquo;{result.transcription}&rdquo;</p>
        </div>
      )}

      {/* Overall Feedback */}
      <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
        <h4 className="font-semibold text-blue-700 dark:text-blue-400 mb-2">
          Retroalimentación General
        </h4>
        <p className="text-sm text-blue-600 dark:text-blue-300">{result.feedback.overall}</p>
      </div>

      {/* Detailed Scores */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Pronunciation */}
        <div className="p-4 rounded-lg border">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold flex items-center gap-2">
              <Mic className="h-4 w-4 text-purple-500" />
              Pronunciación
            </h4>
            <span className={cn('font-bold', getScoreColor(result.feedback.pronunciation.score, result.feedback.pronunciation.maxScore))}>
              {result.feedback.pronunciation.score}/{result.feedback.pronunciation.maxScore}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mb-2">{result.feedback.pronunciation.comments}</p>
          {result.feedback.pronunciation.corrections.length > 0 && (
            <div className="space-y-1 mt-2">
              <p className="text-xs font-medium text-muted-foreground">Correcciones:</p>
              {result.feedback.pronunciation.corrections.map((correction, i) => (
                <div key={i} className="text-xs p-2 bg-muted rounded">
                  <span className="text-red-500 line-through">{correction.spoken}</span>
                  {' → '}
                  <span className="text-green-600 font-medium">{correction.correct}</span>
                  <p className="text-muted-foreground mt-1">{correction.explanation}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Grammar */}
        <div className="p-4 rounded-lg border">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-blue-500" />
              Gramática
            </h4>
            <span className={cn('font-bold', getScoreColor(result.feedback.grammar.score, result.feedback.grammar.maxScore))}>
              {result.feedback.grammar.score}/{result.feedback.grammar.maxScore}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mb-2">{result.feedback.grammar.comments}</p>
          {result.feedback.grammar.corrections.length > 0 && (
            <div className="space-y-1 mt-2">
              <p className="text-xs font-medium text-muted-foreground">Correcciones:</p>
              {result.feedback.grammar.corrections.map((correction, i) => (
                <div key={i} className="text-xs p-2 bg-muted rounded">
                  <span className="text-red-500 line-through">{correction.original}</span>
                  {' → '}
                  <span className="text-green-600 font-medium">{correction.corrected}</span>
                  <p className="text-muted-foreground mt-1">{correction.explanation}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Vocabulary */}
        <div className="p-4 rounded-lg border">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-green-500" />
              Vocabulario
            </h4>
            <span className={cn('font-bold', getScoreColor(result.feedback.vocabulary.score, result.feedback.vocabulary.maxScore))}>
              {result.feedback.vocabulary.score}/{result.feedback.vocabulary.maxScore}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mb-2">{result.feedback.vocabulary.comments}</p>
          {result.feedback.vocabulary.suggestions.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-medium text-muted-foreground mb-1">Sugerencias:</p>
              <div className="flex flex-wrap gap-1">
                {result.feedback.vocabulary.suggestions.map((suggestion, i) => (
                  <span key={i} className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded">
                    {suggestion}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Fluency */}
        <div className="p-4 rounded-lg border">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              Fluidez
            </h4>
            <span className={cn('font-bold', getScoreColor(result.feedback.fluency.score, result.feedback.fluency.maxScore))}>
              {result.feedback.fluency.score}/{result.feedback.fluency.maxScore}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{result.feedback.fluency.comments}</p>
        </div>

        {/* Task Completion */}
        <div className="p-4 rounded-lg border md:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold flex items-center gap-2">
              <Target className="h-4 w-4 text-orange-500" />
              Cumplimiento de la Tarea
            </h4>
            <span className={cn('font-bold', getScoreColor(result.feedback.taskCompletion.score, result.feedback.taskCompletion.maxScore))}>
              {result.feedback.taskCompletion.score}/{result.feedback.taskCompletion.maxScore}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{result.feedback.taskCompletion.comments}</p>
        </div>
      </div>

      {/* Strengths & Areas to Improve */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {result.strengths.length > 0 && (
          <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <h4 className="font-semibold text-green-700 dark:text-green-400 mb-2 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Fortalezas
            </h4>
            <ul className="space-y-1">
              {result.strengths.map((strength, i) => (
                <li key={i} className="text-sm text-green-600 dark:text-green-300 flex items-start gap-2">
                  <TrendingUp className="h-3 w-3 mt-1 flex-shrink-0" />
                  {strength}
                </li>
              ))}
            </ul>
          </div>
        )}

        {result.areasToImprove.length > 0 && (
          <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <h4 className="font-semibold text-amber-700 dark:text-amber-400 mb-2 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Áreas de Mejora
            </h4>
            <ul className="space-y-1">
              {result.areasToImprove.map((area, i) => (
                <li key={i} className="text-sm text-amber-600 dark:text-amber-300 flex items-start gap-2">
                  <XCircle className="h-3 w-3 mt-1 flex-shrink-0" />
                  {area}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
