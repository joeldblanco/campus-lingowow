'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Eye, Edit, Trash2, Search, BookOpen, FileText, Activity } from 'lucide-react'
import { EditLessonDialog } from './edit-lesson-dialog'
import { ViewLessonDialog } from './view-lesson-dialog'
import { deleteLesson } from '@/lib/actions/lessons'
import { toast } from 'sonner'

interface LessonWithDetails {
  id: string
  title: string
  description: string
  order: number
  moduleId: string
  createdAt: Date
  updatedAt: Date
  module: {
    id: string
    title: string
    course: {
      id: string
      title: string
    }
  }
  contentsCount: number
  activitiesCount: number
}

interface LessonsTableProps {
  lessons: LessonWithDetails[]
  onLessonUpdated: () => void
}

export function LessonsTable({ lessons, onLessonUpdated }: LessonsTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [isDeleting, setIsDeleting] = useState<string | null>(null)

  const filteredLessons = lessons.filter(lesson =>
    lesson.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lesson.module.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lesson.module.course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lesson.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar la lección "${title}"?`)) {
      return
    }

    try {
      setIsDeleting(id)
      await deleteLesson(id)
      toast.success('Lección eliminada exitosamente')
      onLessonUpdated()
    } catch (error) {
      console.error('Error deleting lesson:', error)
      toast.error('Error al eliminar la lección')
    } finally {
      setIsDeleting(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Lecciones</CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar lecciones..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredLessons.length === 0 ? (
          <div className="text-center py-8">
            <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900">No hay lecciones</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'No se encontraron lecciones con ese término de búsqueda.' : 'Comienza creando una nueva lección.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredLessons.map((lesson) => (
              <div
                key={lesson.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold">{lesson.title}</h3>
                    <Badge variant="outline">
                      Orden {lesson.order}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Unidad: {lesson.module.title} • Curso: {lesson.module.course.title}
                  </p>
                  {lesson.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {lesson.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      {lesson.contentsCount} contenidos
                    </div>
                    <div className="flex items-center gap-1">
                      <Activity className="h-3 w-3" />
                      {lesson.activitiesCount} actividades
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <ViewLessonDialog lessonId={lesson.id}>
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </ViewLessonDialog>

                  <EditLessonDialog lesson={lesson} onLessonUpdated={onLessonUpdated}>
                    <Button variant="ghost" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </EditLessonDialog>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(lesson.id, lesson.title)}
                    disabled={isDeleting === lesson.id}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
