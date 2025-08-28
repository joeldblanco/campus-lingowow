'use client'

import { useState } from 'react'
import { CourseWithDetails } from '@/lib/actions/courses'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { BookOpen, Users, Calendar, User } from 'lucide-react'

interface ViewCourseDialogProps {
  course: CourseWithDetails
  children: React.ReactNode
}

export function ViewCourseDialog({ course, children }: ViewCourseDialogProps) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            {course.title}
          </DialogTitle>
          <DialogDescription>Información detallada del curso</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{course.language}</Badge>
              <Badge variant="outline">{course.level}</Badge>
              <Badge variant={course.isPublished ? 'default' : 'secondary'}>
                {course.isPublished ? 'Publicado' : 'Borrador'}
              </Badge>
            </div>

            <div>
              <h4 className="font-medium mb-2">Descripción</h4>
              <p className="text-sm text-muted-foreground">{course.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Creado por</p>
                  <p className="text-sm text-muted-foreground">{course.createdBy.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Fecha de creación</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(course.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Módulos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{course._count.modules}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Estudiantes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{course._count.enrollments}</div>
              </CardContent>
            </Card>
          </div>

          {/* Modules */}
          {course.modules.length > 0 && (
            <div>
              <h4 className="font-medium mb-3">Módulos ({course.modules.length})</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {course.modules.map((module, index) => (
                  <div
                    key={module.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-sm">
                        {index + 1}. {module.title}
                      </p>
                      {module.description && (
                        <p className="text-xs text-muted-foreground mt-1">{module.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          Nivel {module.level}
                        </Badge>
                        <Badge
                          variant={module.isPublished ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {module.isPublished ? 'Publicado' : 'Borrador'}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">
                        {module._count.lessons} lecciones
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Enrollments */}
          {course.enrollments.length > 0 && (
            <div>
              <h4 className="font-medium mb-3">
                Estudiantes Inscritos ({course.enrollments.length})
              </h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {course.enrollments.slice(0, 5).map((enrollment) => (
                  <div
                    key={enrollment.id}
                    className="flex items-center justify-between p-2 border rounded"
                  >
                    <div>
                      <p className="text-sm font-medium">{enrollment.student.name}</p>
                      <p className="text-xs text-muted-foreground">{enrollment.student.email}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {enrollment.status}
                    </Badge>
                  </div>
                ))}
                {course.enrollments.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center">
                    Y {course.enrollments.length - 5} estudiantes más...
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
