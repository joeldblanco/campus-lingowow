'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  BookOpen,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  GripVertical,
  Clock,
  CheckCircle2,
  Circle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import type { StudentLessonListItem, StudentLessonStats } from '@/types/student-lesson'
import {
  deleteStudentLesson,
  toggleStudentLessonPublished,
} from '@/lib/actions/student-lessons'
import { toast } from 'sonner'

interface StudentLessonsListProps {
  studentId: string
  studentName: string
  enrollmentId: string
  courseName: string
  lessons: StudentLessonListItem[]
  stats: StudentLessonStats
  teacherId: string
}

export function StudentLessonsList({
  studentId,
  studentName,
  enrollmentId,
  courseName,
  lessons,
  stats,
  teacherId,
}: StudentLessonsListProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [isToggling, setIsToggling] = useState<string | null>(null)

  const handleCreateLesson = () => {
    router.push(`/teacher/students/${studentId}/lessons/new?enrollmentId=${enrollmentId}`)
  }

  const handleEditLesson = (lessonId: string) => {
    router.push(`/teacher/students/${studentId}/lessons/${lessonId}/edit`)
  }

  const handleTogglePublished = async (lessonId: string) => {
    setIsToggling(lessonId)
    try {
      const result = await toggleStudentLessonPublished(lessonId, teacherId)
      if (result.success) {
        toast.success(
          result.data?.isPublished ? 'Lección publicada' : 'Lección despublicada'
        )
        router.refresh()
      } else {
        toast.error(result.error)
      }
    } catch {
      toast.error('Error al cambiar el estado de publicación')
    } finally {
      setIsToggling(null)
    }
  }

  const handleDeleteLesson = async (lessonId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta lección?')) return

    setIsDeleting(lessonId)
    try {
      const result = await deleteStudentLesson(lessonId, teacherId)
      if (result.success) {
        toast.success('Lección eliminada')
        router.refresh()
      } else {
        toast.error(result.error)
      }
    } catch {
      toast.error('Error al eliminar la lección')
    } finally {
      setIsDeleting(null)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Lecciones de {studentName}
          </CardTitle>
          <CardDescription>{courseName}</CardDescription>
        </div>
        <Button onClick={handleCreateLesson} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Nueva Lección
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="text-center">
            <p className="text-2xl font-bold">{stats.totalLessons}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{stats.publishedLessons}</p>
            <p className="text-xs text-muted-foreground">Publicadas</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.completedLessons}</p>
            <p className="text-xs text-muted-foreground">Completadas</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-600">
              {Math.round(stats.averageProgress)}%
            </p>
            <p className="text-xs text-muted-foreground">Progreso</p>
          </div>
        </div>

        {/* Lessons List */}
        {lessons.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No hay lecciones creadas para este estudiante</p>
            <Button onClick={handleCreateLesson} variant="outline" className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Crear primera lección
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {lessons.map((lesson, index) => (
              <div
                key={lesson.id}
                className={cn(
                  'flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors',
                  isDeleting === lesson.id && 'opacity-50 pointer-events-none'
                )}
              >
                <div className="cursor-grab text-muted-foreground hover:text-foreground">
                  <GripVertical className="h-5 w-5" />
                </div>

                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-medium text-sm">
                  {index + 1}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium truncate">{lesson.title}</h4>
                    {lesson.isPublished ? (
                      <Badge variant="default" className="bg-green-500">
                        <Eye className="h-3 w-3 mr-1" />
                        Publicada
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <EyeOff className="h-3 w-3 mr-1" />
                        Borrador
                      </Badge>
                    )}
                  </div>
                  {lesson.description && (
                    <p className="text-sm text-muted-foreground truncate mt-1">
                      {lesson.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {lesson.duration} min
                    </span>
                    {lesson.progress && (
                      <span className="flex items-center gap-1">
                        {lesson.progress.completed ? (
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                        ) : (
                          <Circle className="h-3 w-3" />
                        )}
                        {Math.round(lesson.progress.percentage)}% completado
                      </span>
                    )}
                  </div>
                </div>

                {lesson.progress && (
                  <div className="w-24">
                    <Progress value={lesson.progress.percentage} className="h-2" />
                  </div>
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEditLesson(lesson.id)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleTogglePublished(lesson.id)}
                      disabled={isToggling === lesson.id}
                    >
                      {lesson.isPublished ? (
                        <>
                          <EyeOff className="h-4 w-4 mr-2" />
                          Despublicar
                        </>
                      ) : (
                        <>
                          <Eye className="h-4 w-4 mr-2" />
                          Publicar
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Copy className="h-4 w-4 mr-2" />
                      Duplicar
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleDeleteLesson(lesson.id)}
                      className="text-destructive focus:text-destructive"
                      disabled={isDeleting === lesson.id}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
