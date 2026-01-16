'use client'

import { cn } from '@/lib/utils'
import { useState } from 'react'

export type QuestionStatus = 'answered' | 'flagged' | 'current' | 'unanswered'

interface QuestionNavigatorProps {
  questions: {
    id: string
    status: QuestionStatus
    navIndex?: number // Índice real de navegación en allQuestions
  }[]
  onNavigate: (index: number) => void
  className?: string
}

export function QuestionNavigator({ 
  questions, 
  onNavigate,
  className 
}: QuestionNavigatorProps) {
  const [showLegend, setShowLegend] = useState(false)

  const getButtonStyles = (status: QuestionStatus) => {
    // El status 'current' ya viene calculado correctamente desde el componente padre
    switch (status) {
      case 'current':
        return "bg-white dark:bg-gray-900 border-2 border-primary text-primary shadow-sm"
      case 'answered':
        return "bg-primary text-white hover:bg-primary/90"
      case 'flagged':
        return "bg-yellow-100 text-yellow-700 border border-yellow-300 hover:bg-yellow-200"
      case 'unanswered':
      default:
        return "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
    }
  }

  return (
    <div className={cn("bg-white dark:bg-[#1a2632] rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden", className)}>
      <div className="bg-gray-50 dark:bg-gray-800/50 p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
        <h3 className="font-bold text-foreground text-sm">Navegador de Preguntas</h3>
        <button 
          onClick={() => setShowLegend(!showLegend)}
          className="text-xs text-primary hover:underline"
        >
          {showLegend ? 'Ocultar Leyenda' : 'Mostrar Leyenda'}
        </button>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-5 gap-3">
          {questions.map((question, index) => {
            // Usar navIndex si está disponible, de lo contrario usar el índice del array
            const targetIndex = question.navIndex ?? index
            return (
              <button
                key={question.id}
                onClick={() => onNavigate(targetIndex)}
                className={cn(
                  "aspect-square flex items-center justify-center rounded-lg text-sm font-bold transition-colors relative",
                  getButtonStyles(question.status)
                )}
              >
                {index + 1}
                {question.status === 'flagged' && (
                  <span className="absolute top-0.5 right-0.5 size-2 bg-yellow-500 rounded-full" />
                )}
              </button>
            )
          })}
        </div>
      </div>
      {showLegend && (
        <div className="px-6 pb-6 pt-0 flex flex-wrap gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="size-3 rounded-full bg-primary" />
            <span>Respondida</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="size-3 rounded-full bg-yellow-100 border border-yellow-300" />
            <span>Marcada</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="size-3 rounded-full bg-gray-100 border border-gray-300" />
            <span>Sin responder</span>
          </div>
        </div>
      )}
    </div>
  )
}
