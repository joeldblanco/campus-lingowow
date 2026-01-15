'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { CheckCircle2, XCircle, Clock, RotateCcw, Eye } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ExamAttempt {
  id: string
  status: string
  score: number | null
  startedAt: Date
  submittedAt: Date | null
  attemptNumber: number
}

interface StudentExamAttemptsProps {
  attempts: ExamAttempt[]
  examId: string
  passingScore: number
  maxAttempts: number
}

export function StudentExamAttempts({ 
  attempts, 
  examId, 
  passingScore,
  maxAttempts 
}: StudentExamAttemptsProps) {
  if (attempts.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Sin intentos</h3>
          <p className="text-muted-foreground">
            No has realizado ningún intento de este examen todavía.
          </p>
        </CardContent>
      </Card>
    )
  }

  const getStatusBadge = (attempt: ExamAttempt) => {
    if (attempt.status === 'IN_PROGRESS') {
      return (
        <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">
          <Clock className="w-3 h-3 mr-1" />
          En progreso
        </Badge>
      )
    }
    
    if (attempt.status === 'SUBMITTED') {
      return (
        <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
          <Clock className="w-3 h-3 mr-1" />
          Pendiente de revisión
        </Badge>
      )
    }

    if (attempt.status === 'COMPLETED') {
      const passed = (attempt.score || 0) >= passingScore
      return (
        <Badge className={cn(
          passed 
            ? "bg-green-100 text-green-700 hover:bg-green-100" 
            : "bg-red-100 text-red-700 hover:bg-red-100"
        )}>
          {passed ? (
            <CheckCircle2 className="w-3 h-3 mr-1" />
          ) : (
            <XCircle className="w-3 h-3 mr-1" />
          )}
          {attempt.score?.toFixed(1)}%
        </Badge>
      )
    }

    return <Badge variant="secondary">Desconocido</Badge>
  }

  const getActionButton = (attempt: ExamAttempt) => {
    if (attempt.status === 'IN_PROGRESS') {
      return (
        <Link href={`/exams/${examId}/take`}>
          <Button size="sm">
            <RotateCcw className="w-4 h-4 mr-2" />
            Continuar
          </Button>
        </Link>
      )
    }

    if (attempt.status === 'COMPLETED' || attempt.status === 'SUBMITTED') {
      return (
        <Link href={`/exams/${examId}/${attempt.id}/results`}>
          <Button size="sm" variant="outline">
            <Eye className="w-4 h-4 mr-2" />
            Ver resultados
          </Button>
        </Link>
      )
    }

    return null
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Tus intentos</h3>
        <span className="text-sm text-muted-foreground">
          {attempts.length} de {maxAttempts} intentos usados
        </span>
      </div>
      
      <div className="space-y-3">
        {attempts.map((attempt) => (
          <Card key={attempt.id} className="hover:bg-muted/30 transition-colors">
            <CardHeader className="py-4 px-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base font-medium">
                      Intento #{attempt.attemptNumber}
                    </CardTitle>
                    {getStatusBadge(attempt)}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      Iniciado: {format(new Date(attempt.startedAt), 'PPp', { locale: es })}
                    </span>
                    {attempt.submittedAt && (
                      <span>
                        Enviado: {format(new Date(attempt.submittedAt), 'PPp', { locale: es })}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getActionButton(attempt)}
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  )
}
