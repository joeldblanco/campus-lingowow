'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  ClipboardList,
  MoreVertical,
  Edit,
  Trash2,
  Users,
  Eye,
  EyeOff,
  BarChart3,
  Clock,
  Target,
  CheckCircle2,
  PlayCircle,
} from 'lucide-react'
import { toggleExamPublished, deleteTeacherExam } from '@/lib/actions/teacher-exams'
import { toast } from 'sonner'
import { AssignStudentsDialog } from './assign-students-dialog'

interface ExamAssignment {
  id: string
  student: {
    id: string
    name: string
    lastName: string | null
    email: string
  }
  status: string
  dueDate: Date | null
}

interface ExamAttempt {
  id: string
  status: string
  score: number | null
  user: {
    id: string
    name: string
    lastName: string | null
  }
}

interface Exam {
  id: string
  title: string
  description: string
  timeLimit: number | null
  passingScore: number
  maxAttempts: number
  isPublished: boolean
  questionCount: number
  totalPoints: number
  assignments: ExamAssignment[]
  attempts: ExamAttempt[]
  _count: {
    assignments: number
    attempts: number
  }
}

interface ExamListProps {
  exams: Exam[]
  courseId: string
  isPersonalized?: boolean
}

export function ExamList({ exams, courseId, isPersonalized = false }: ExamListProps) {
  const [deleteExamId, setDeleteExamId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [assignExamId, setAssignExamId] = useState<string | null>(null)

  const handleTogglePublish = async (examId: string) => {
    const result = await toggleExamPublished(examId)
    if (result.success) {
      toast.success(result.isPublished ? 'Examen publicado' : 'Examen despublicado')
    } else {
      toast.error(result.error || 'Error al cambiar estado')
    }
  }

  const handleDelete = async () => {
    if (!deleteExamId) return

    setIsDeleting(true)
    try {
      const result = await deleteTeacherExam(deleteExamId)
      if (result.success) {
        toast.success('Examen eliminado')
      } else {
        toast.error(result.error || 'Error al eliminar')
      }
    } finally {
      setIsDeleting(false)
      setDeleteExamId(null)
    }
  }

  if (exams.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <ClipboardList className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Sin exámenes</h3>
          <p className="text-muted-foreground">
            {isPersonalized
              ? 'Aún no has creado exámenes para este curso.'
              : 'Este curso aún no tiene exámenes configurados por los administradores.'}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <div className="space-y-3">
        {exams.map((exam) => {
          const completedAttempts = exam.attempts.filter((a) => a.status === 'COMPLETED')
          const passedAttempts = completedAttempts.filter(
            (a) => (a.score || 0) >= exam.passingScore
          )

          return (
            <Card key={exam.id} className="hover:bg-muted/30 transition-colors">
              <CardHeader className="py-4 px-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <CardTitle className="text-base font-medium truncate">
                        {exam.title}
                      </CardTitle>
                      <Badge variant={exam.isPublished ? 'default' : 'secondary'}>
                        {exam.isPublished ? 'Publicado' : 'Borrador'}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <ClipboardList className="w-3.5 h-3.5" />
                        {exam.questionCount} preguntas
                      </span>
                      <span className="flex items-center gap-1">
                        <Target className="w-3.5 h-3.5" />
                        {exam.totalPoints} pts
                      </span>
                      {exam.timeLimit && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {exam.timeLimit} min
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {exam._count.assignments} asignados
                      </span>
                      {completedAttempts.length > 0 && (
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {passedAttempts.length}/{completedAttempts.length} aprobados
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAssignExamId(exam.id)}
                    >
                      <Users className="w-4 h-4 mr-1" />
                      Asignar
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/teacher/exams/${exam.id}/preview`}>
                            <PlayCircle className="w-4 h-4 mr-2" />
                            Previsualizar
                          </Link>
                        </DropdownMenuItem>
                        {isPersonalized && (
                          <DropdownMenuItem asChild>
                            <Link href={`/teacher/exams/${exam.id}/edit`}>
                              <Edit className="w-4 h-4 mr-2" />
                              Editar
                            </Link>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => handleTogglePublish(exam.id)}>
                          {exam.isPublished ? (
                            <>
                              <EyeOff className="w-4 h-4 mr-2" />
                              Despublicar
                            </>
                          ) : (
                            <>
                              <Eye className="w-4 h-4 mr-2" />
                              Publicar
                            </>
                          )}
                        </DropdownMenuItem>
                        {exam._count.attempts > 0 && (
                          <DropdownMenuItem asChild>
                            <Link href={`/teacher/exams/${exam.id}/results`}>
                              <BarChart3 className="w-4 h-4 mr-2" />
                              Ver Resultados
                            </Link>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleteExamId(exam.id)}
                          disabled={exam._count.attempts > 0}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>
            </Card>
          )
        })}
      </div>

      <AlertDialog open={!!deleteExamId} onOpenChange={() => setDeleteExamId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar examen?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El examen y todas sus preguntas serán eliminados
              permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {assignExamId && (
        <AssignStudentsDialog
          examId={assignExamId}
          courseId={courseId}
          open={!!assignExamId}
          onOpenChange={(open: boolean) => !open && setAssignExamId(null)}
          currentAssignments={
            exams.find((e) => e.id === assignExamId)?.assignments.map((a) => a.student.id) || []
          }
        />
      )}
    </>
  )
}
