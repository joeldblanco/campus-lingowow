'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ClipboardList,
  Clock,
  Target,
  User,
  Calendar,
  PlayCircle,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RotateCcw,
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface ExamCourse {
  id: string
  title: string
  language: string
  level: string
}

interface ExamTeacher {
  id: string
  name: string | null
  lastName: string | null
}

interface ExamAssignment {
  id: string
  status: string
  dueDate: Date | null
  instructions: string | null
  assignedAt: Date
}

interface ExamAttempts {
  total: number
  completed: number
  remaining: number
  inProgressId: string | null
  bestScore: number | null
  passed: boolean
}

interface StudentExam {
  id: string
  title: string
  description: string
  instructions: string | null
  timeLimit: number | null
  passingScore: number
  maxAttempts: number
  questionCount: number
  totalPoints: number
  course: ExamCourse | null
  teacher: ExamTeacher | null
  assignment: ExamAssignment
  attempts: ExamAttempts
}

interface StudentExamsListProps {
  exams: StudentExam[]
}

export function StudentExamsList({ exams }: StudentExamsListProps) {
  if (exams.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <ClipboardList className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Sin exámenes asignados</h3>
          <p className="text-muted-foreground">
            Aún no tienes exámenes asignados por tus profesores.
          </p>
        </CardContent>
      </Card>
    )
  }

  const getStatusBadge = (exam: StudentExam) => {
    if (exam.attempts.passed) {
      return (
        <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Aprobado
        </Badge>
      )
    }
    if (exam.attempts.completed > 0 && !exam.attempts.passed) {
      return (
        <Badge variant="destructive">
          <XCircle className="w-3 h-3 mr-1" />
          No aprobado
        </Badge>
      )
    }
    if (exam.attempts.inProgressId) {
      return (
        <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">
          <AlertCircle className="w-3 h-3 mr-1" />
          En progreso
        </Badge>
      )
    }
    if (exam.assignment.dueDate && new Date(exam.assignment.dueDate) < new Date()) {
      return (
        <Badge variant="secondary">
          <Clock className="w-3 h-3 mr-1" />
          Vencido
        </Badge>
      )
    }
    return (
      <Badge variant="outline">
        Pendiente
      </Badge>
    )
  }

  const getActionButton = (exam: StudentExam) => {
    if (exam.attempts.inProgressId) {
      return (
        <Link href={`/exams/${exam.id}/take`}>
          <Button size="sm">
            <RotateCcw className="w-4 h-4 mr-2" />
            Continuar
          </Button>
        </Link>
      )
    }
    if (exam.attempts.remaining > 0 && !exam.attempts.passed) {
      return (
        <Link href={`/exams/${exam.id}/take`}>
          <Button size="sm">
            <PlayCircle className="w-4 h-4 mr-2" />
            {exam.attempts.completed > 0 ? 'Reintentar' : 'Comenzar'}
          </Button>
        </Link>
      )
    }
    if (exam.attempts.completed > 0) {
      return (
        <Link href={`/exams/${exam.attempts.inProgressId || exam.id}/results`}>
          <Button size="sm" variant="outline">
            Ver Resultados
          </Button>
        </Link>
      )
    }
    return null
  }

  return (
    <div className="space-y-4">
      {exams.map((exam) => (
        <Card key={exam.id} className="hover:bg-muted/30 transition-colors">
          <CardHeader className="py-4 px-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <CardTitle className="text-base font-medium">
                    {exam.title}
                  </CardTitle>
                  {getStatusBadge(exam)}
                </div>

                {exam.description && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {exam.description}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                  {exam.course && (
                    <span className="flex items-center gap-1">
                      <ClipboardList className="w-3.5 h-3.5" />
                      {exam.course.title}
                    </span>
                  )}
                  {exam.teacher && (
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5" />
                      {exam.teacher.name} {exam.teacher.lastName}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Target className="w-3.5 h-3.5" />
                    {exam.questionCount} preguntas
                  </span>
                  {exam.timeLimit && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {exam.timeLimit} min
                    </span>
                  )}
                  {exam.assignment.dueDate && (
                    <span className={cn(
                      "flex items-center gap-1",
                      new Date(exam.assignment.dueDate) < new Date() && "text-destructive"
                    )}>
                      <Calendar className="w-3.5 h-3.5" />
                      Vence: {format(new Date(exam.assignment.dueDate), 'PPP', { locale: es })}
                    </span>
                  )}
                </div>

                {exam.attempts.completed > 0 && (
                  <div className="mt-3 flex items-center gap-4 text-sm">
                    <span>
                      Mejor puntaje:{' '}
                      <span className={cn(
                        "font-semibold",
                        exam.attempts.passed ? "text-green-600" : "text-destructive"
                      )}>
                        {exam.attempts.bestScore?.toFixed(1)}%
                      </span>
                      <span className="text-muted-foreground ml-1">
                        (mínimo: {exam.passingScore}%)
                      </span>
                    </span>
                    <span className="text-muted-foreground">
                      Intentos: {exam.attempts.completed}/{exam.maxAttempts}
                    </span>
                  </div>
                )}

                {exam.assignment.instructions && (
                  <div className="mt-3 p-2 bg-muted/50 rounded text-sm">
                    <span className="font-medium">Instrucciones del profesor: </span>
                    {exam.assignment.instructions}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                {getActionButton(exam)}
              </div>
            </div>
          </CardHeader>
        </Card>
      ))}
    </div>
  )
}
