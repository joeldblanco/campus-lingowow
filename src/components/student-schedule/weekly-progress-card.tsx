'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { TrendingUp } from 'lucide-react'
import type { WeeklyProgress } from '@/lib/actions/student-schedule'

interface WeeklyProgressCardProps {
  progress: WeeklyProgress
}

export function WeeklyProgressCard({ progress }: WeeklyProgressCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          Progreso Semanal
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Has completado{' '}
          <span className="font-bold text-foreground">{progress.completed}</span> de{' '}
          <span className="font-bold text-foreground">{progress.total}</span>{' '}
          clases esta semana.
          {progress.total > 0 && progress.completed === progress.total && (
            <span className="text-green-600 dark:text-green-400"> ¡Excelente!</span>
          )}
        </p>
        <Progress value={progress.percentage} className="h-2" />
        <p className="text-xs text-muted-foreground text-right">
          {progress.percentage}% completado
        </p>
      </CardContent>
    </Card>
  )
}
