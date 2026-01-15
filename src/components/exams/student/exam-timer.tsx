'use client'

import { useState, useEffect, useCallback } from 'react'
import { Timer } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ExamTimerProps {
  timeLimit: number
  startedAt: string
  onTimeUp?: () => void
  className?: string
}

export function ExamTimer({ timeLimit, startedAt, onTimeUp, className }: ExamTimerProps) {
  // Calcular tiempo restante basado en el tiempo actual del cliente
  const calculateRemainingSeconds = useCallback(() => {
    const elapsed = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)
    return Math.max(0, (timeLimit * 60) - elapsed)
  }, [timeLimit, startedAt])

  const [timeLeft, setTimeLeft] = useState(calculateRemainingSeconds)

  const formatTime = useCallback((totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    return { hours, minutes, seconds }
  }, [])

  useEffect(() => {
    if (timeLeft <= 0) {
      onTimeUp?.()
      return
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          onTimeUp?.()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [timeLeft, onTimeUp])

  const { hours, minutes, seconds } = formatTime(timeLeft)
  const isLowTime = timeLeft <= 300 // 5 minutes

  return (
    <div className={cn("bg-white dark:bg-[#1a2632] rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden", className)}>
      <div className="bg-primary/5 p-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
        <Timer className="h-5 w-5 text-primary" />
        <h3 className="font-bold text-foreground text-sm">Tiempo Restante</h3>
      </div>
      <div className="p-6 flex gap-4">
        <div className="flex grow basis-0 flex-col items-stretch gap-2">
          <div className="flex h-14 grow items-center justify-center rounded-lg bg-muted">
            <p className="text-foreground text-2xl font-bold tracking-tight">
              {String(hours).padStart(2, '0')}
            </p>
          </div>
          <p className="text-muted-foreground text-xs text-center font-medium uppercase">Horas</p>
        </div>
        <div className="text-2xl font-bold text-gray-300 pt-3">:</div>
        <div className="flex grow basis-0 flex-col items-stretch gap-2">
          <div className="flex h-14 grow items-center justify-center rounded-lg bg-muted">
            <p className="text-foreground text-2xl font-bold tracking-tight">
              {String(minutes).padStart(2, '0')}
            </p>
          </div>
          <p className="text-muted-foreground text-xs text-center font-medium uppercase">Mins</p>
        </div>
        <div className="text-2xl font-bold text-gray-300 pt-3">:</div>
        <div className="flex grow basis-0 flex-col items-stretch gap-2">
          <div className={cn(
            "flex h-14 grow items-center justify-center rounded-lg ring-1",
            isLowTime 
              ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 ring-red-100 dark:ring-red-900" 
              : "bg-muted ring-transparent"
          )}>
            <p className="text-2xl font-bold tracking-tight">
              {String(seconds).padStart(2, '0')}
            </p>
          </div>
          <p className="text-muted-foreground text-xs text-center font-medium uppercase">Segs</p>
        </div>
      </div>
    </div>
  )
}
