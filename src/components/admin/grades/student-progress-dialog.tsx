'use client'

import { useState, useEffect, useCallback } from 'react'
import { getStudentProgressReport } from '@/lib/actions/grades'

interface StudentProgressData {
  student: {
    id: string
    name: string
    lastName: string | null
    email: string
  }
  courses: Array<{
    course: {
      id: string
      title: string
      language: string
      level: string
    }
    enrollmentStatus: string
    enrollmentProgress: number
    enrollmentDate: Date
    totalActivities: number
    completedActivities: number
    averageScore: number
    activities: Array<{
      title: string
      type: string
      score: number | null
      status: string
      attempts: number
      completedAt: Date | null
    }>
  }>
}
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
import { User, BookOpen, TrendingUp, Calendar } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

interface StudentProgressDialogProps {
  studentId: string
  children: React.ReactNode
}

export function StudentProgressDialog({ studentId, children }: StudentProgressDialogProps) {
  const [open, setOpen] = useState(false)
  const [progressData, setProgressData] = useState<StudentProgressData | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const loadProgressData = useCallback(async () => {
    if (!studentId) return
    
    setIsLoading(true)
    try {
      const data = await getStudentProgressReport(studentId)
      setProgressData(data)
    } catch (error) {
      console.error('Error loading progress data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [studentId])

  useEffect(() => {
    if (open && !progressData) {
      loadProgressData()
    }
  }, [open, progressData, loadProgressData])


  const getScoreBadge = (score: number) => {
    if (score >= 90) return <Badge className="bg-green-100 text-green-800">Excelente</Badge>
    if (score >= 80) return <Badge className="bg-blue-100 text-blue-800">Muy Bueno</Badge>
    if (score >= 70) return <Badge className="bg-yellow-100 text-yellow-800">Bueno</Badge>
    if (score >= 60) return <Badge className="bg-orange-100 text-orange-800">Regular</Badge>
    return <Badge variant="destructive">Necesita Mejora</Badge>
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge variant="default">Activo</Badge>
      case 'COMPLETED':
        return <Badge className="bg-green-100 text-green-800">Completado</Badge>
      case 'PAUSED':
        return <Badge variant="secondary">Pausado</Badge>
      case 'CANCELLED':
        return <Badge variant="destructive">Cancelado</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Reporte de Progreso del Estudiante
          </DialogTitle>
          <DialogDescription>
            Progreso completo del estudiante en todos los cursos
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-64" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : progressData ? (
          <div className="space-y-6">
            {/* Student Info */}
            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-full">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">
                  {progressData.student.name} {progressData.student.lastName}
                </h3>
                <p className="text-muted-foreground">{progressData.student.email}</p>
              </div>
            </div>

            {/* Overall Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Cursos Inscritos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{progressData.courses.length}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Cursos Activos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {
                      progressData.courses.filter((c) => c.enrollmentStatus === 'ACTIVE')
                        .length
                    }
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Cursos Completados</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {
                      progressData.courses.filter((c) => c.enrollmentStatus === 'COMPLETED')
                        .length
                    }
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Promedio General</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">
                    {progressData.courses.length > 0
                      ? Math.round(
                          progressData.courses.reduce(
                            (sum: number, c) => sum + c.averageScore,
                            0
                          ) / progressData.courses.length
                        )
                      : 0}
                    %
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Courses Progress */}
            <div>
              <h4 className="font-medium mb-4">Progreso por Curso</h4>
              <div className="space-y-4">
                {progressData.courses.map((courseData, index: number) => (
                  <Card key={index}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <BookOpen className="h-4 w-4" />
                            {courseData.course.title}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {courseData.course.language} - {courseData.course.level}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(courseData.enrollmentStatus)}
                          {courseData.averageScore > 0 && getScoreBadge(courseData.averageScore)}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <p className="text-sm font-medium">Progreso del Curso</p>
                          <p className="text-lg font-bold">
                            {Math.round(courseData.enrollmentProgress)}%
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Promedio</p>
                          <p className="text-lg font-bold">{courseData.averageScore}%</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Actividades</p>
                          <p className="text-lg font-bold">
                            {courseData.completedActivities}/{courseData.totalActivities}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Inscrito
                          </p>
                          <p className="text-sm">{formatDate(courseData.enrollmentDate)}</p>
                        </div>
                      </div>

                      {/* Recent Activities */}
                      {courseData.activities.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-2">Actividades Recientes</p>
                          <div className="space-y-2 max-h-32 overflow-y-auto">
                            {courseData.activities
                              .slice(0, 5)
                              .map((activity, actIndex: number) => (
                                <div
                                  key={actIndex}
                                  className="flex items-center justify-between text-sm p-2 bg-muted/30 rounded"
                                >
                                  <div>
                                    <p className="font-medium">{activity.title}</p>
                                    <p className="text-xs text-muted-foreground">{activity.type}</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge
                                      variant={
                                        activity.status === 'COMPLETED' ? 'default' : 'outline'
                                      }
                                    >
                                      {activity.status}
                                    </Badge>
                                    {activity.score !== null && (
                                      <span className="font-medium">{activity.score}%</span>
                                    )}
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {progressData.courses.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Este estudiante no tiene cursos inscritos.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Error al cargar los datos del estudiante.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
