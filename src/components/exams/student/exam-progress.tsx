'use client'

import { cn } from '@/lib/utils'

interface ExamProgressProps {
  answeredCount: number
  totalQuestions: number
  className?: string
}

export function ExamProgress({ answeredCount, totalQuestions, className }: ExamProgressProps) {
  const percentage = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0

  return (
    <div className={cn("bg-white dark:bg-[#1a2632] rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden", className)}>
      <div className="p-6 space-y-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-bold text-foreground text-sm">Progreso del Examen</h3>
          <span className="text-sm font-bold text-primary">{percentage}%</span>
        </div>
        <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2.5">
          <div 
            className="bg-primary h-2.5 rounded-full transition-all duration-500" 
            style={{ width: `${percentage}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {answeredCount} de {totalQuestions} preguntas respondidas
        </p>
      </div>
    </div>
  )
}
