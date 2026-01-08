'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BookOpen, FileText, Activity } from 'lucide-react'
import { getLessonById } from '@/lib/actions/lessons'
import { toast } from 'sonner'

interface ViewLessonDialogProps {
  children: React.ReactNode
  lessonId: string
}

export function ViewLessonDialog({ children, lessonId }: ViewLessonDialogProps) {
  const [open, setOpen] = useState(false)
  const [lesson, setLesson] = useState<{
    id: string
    title: string
    description: string
    order: number
    createdAt: Date
    module: {
      id: string
      title: string
      course: {
        id: string
        title: string
      }
    } | null
    contents: Array<{
      id: string
      title: string
      contentType: string
      order: number
    }>
    activities: Array<{
      order: number
      activity: {
        id: string
        title: string
        activityType: string
        points: number
      }
    }>
  } | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const loadLesson = async () => {
      if (!open || !lessonId) return

      try {
        setIsLoading(true)
        const lessonData = await getLessonById(lessonId)
        setLesson(lessonData)
      } catch (error) {
        console.error('Error loading lesson:', error)
        toast.error('Error al cargar la lección')
      } finally {
        setIsLoading(false)
      }
    }

    loadLesson()
  }, [open, lessonId])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalles de la Lección</DialogTitle>
          <DialogDescription>
            Información completa de la lección y su contenido.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : lesson ? (
          <div className="space-y-6">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    {lesson.title}
                  </CardTitle>
                  <Badge variant="outline">
                    Orden {lesson.order}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Módulo</h4>
                  <p className="text-sm text-muted-foreground">{lesson.module?.title || 'N/A'}</p>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Curso</h4>
                  <p className="text-sm text-muted-foreground">{lesson.module?.course.title || 'N/A'}</p>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Descripción</h4>
                  <p className="text-sm text-muted-foreground">{lesson.description}</p>
                </div>

                <div className="text-sm">
                  <span className="font-medium">Creada:</span>{' '}
                  {new Date(lesson.createdAt).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>

            {/* Contents */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Contenidos ({lesson.contents?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {lesson.contents && lesson.contents.length > 0 ? (
                  <div className="space-y-2">
                    {lesson.contents.map((content) => (
                      <div
                        key={content.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div>
                          <h5 className="font-medium">{content.title}</h5>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {content.contentType}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              Orden: {content.order}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No hay contenidos asignados a esta lección.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Activities */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Actividades ({lesson.activities?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {lesson.activities && lesson.activities.length > 0 ? (
                  <div className="space-y-2">
                    {lesson.activities.map((lessonActivity) => (
                      <div
                        key={lessonActivity.activity.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div>
                          <h5 className="font-medium">{lessonActivity.activity.title}</h5>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {lessonActivity.activity.activityType}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {lessonActivity.activity.points} XP
                            </span>
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Orden: {lessonActivity.order}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No hay actividades asignadas a esta lección.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No se pudo cargar la información de la lección.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
