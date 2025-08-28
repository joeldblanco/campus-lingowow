'use client'

import { useState } from 'react'
import { StudentGradeData, updateActivityGrade } from '@/lib/actions/grades'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Award, BookOpen, TrendingUp, Edit2, Save, X } from 'lucide-react'
import { toast } from 'sonner'

interface ViewGradesDialogProps {
  grade: StudentGradeData
  children: React.ReactNode
}

export function ViewGradesDialog({ grade, children }: ViewGradesDialogProps) {
  const [open, setOpen] = useState(false)
  const [editingActivity, setEditingActivity] = useState<string | null>(null)
  const [editScore, setEditScore] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)

  const getScoreBadge = (score: number | null) => {
    if (score === null) return <Badge variant="outline">Sin calificar</Badge>
    if (score >= 90) return <Badge className="bg-green-100 text-green-800">Excelente</Badge>
    if (score >= 80) return <Badge className="bg-blue-100 text-blue-800">Muy Bueno</Badge>
    if (score >= 70) return <Badge className="bg-yellow-100 text-yellow-800">Bueno</Badge>
    if (score >= 60) return <Badge className="bg-orange-100 text-orange-800">Regular</Badge>
    return <Badge variant="destructive">Necesita Mejora</Badge>
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge className="bg-green-100 text-green-800">Completada</Badge>
      case 'IN_PROGRESS':
        return <Badge className="bg-blue-100 text-blue-800">En Progreso</Badge>
      case 'ASSIGNED':
        return <Badge variant="outline">Asignada</Badge>
      case 'EXPIRED':
        return <Badge variant="destructive">Expirada</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const handleEditScore = (activityId: string, currentScore: number | null) => {
    setEditingActivity(activityId)
    setEditScore(currentScore?.toString() || '')
  }

  const handleSaveScore = async (activityId: string) => {
    const score = parseFloat(editScore)
    if (isNaN(score) || score < 0 || score > 100) {
      toast.error('La calificación debe ser un número entre 0 y 100')
      return
    }

    setIsUpdating(true)
    try {
      const result = await updateActivityGrade(grade.studentId, activityId, score)
      if (result.success) {
        toast.success('Calificación actualizada exitosamente')
        setEditingActivity(null)
        setEditScore('')
        window.location.reload()
      } else {
        toast.error(result.error || 'Error al actualizar la calificación')
      }
    } catch (error) {
      console.error(error)
      toast.error('Error al actualizar la calificación')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleCancelEdit = () => {
    setEditingActivity(null)
    setEditScore('')
  }

  const formatDate = (date: Date | null) => {
    if (!date) return 'No completada'
    return new Date(date).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Calificaciones de {grade.studentName}
          </DialogTitle>
          <DialogDescription>
            {grade.courseTitle} - {grade.courseLanguage} ({grade.courseLevel})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  Promedio
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{grade.averageScore}%</div>
                {getScoreBadge(grade.averageScore)}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Actividades
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{grade.completedActivities}</div>
                <p className="text-sm text-muted-foreground">
                  de {grade.totalActivities} completadas
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Progreso
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{Math.round(grade.enrollmentProgress)}%</div>
                <p className="text-sm text-muted-foreground">Curso completado</p>
              </CardContent>
            </Card>
          </div>

          {/* Activities List */}
          <div>
            <h4 className="font-medium mb-4">Actividades y Calificaciones</h4>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {grade.activities.map((activity) => (
                <Card key={activity.activityId} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <div>
                        <p className="font-medium">{activity.activityTitle}</p>
                        <p className="text-sm text-muted-foreground">
                          Tipo: {activity.activityType}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {getStatusBadge(activity.status)}
                        <Badge variant="outline">
                          {activity.attempts} intento{activity.attempts !== 1 ? 's' : ''}
                        </Badge>
                      </div>

                      <p className="text-xs text-muted-foreground">
                        Completada: {formatDate(activity.completedAt)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {editingActivity === activity.activityId ? (
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={editScore}
                            onChange={(e) => setEditScore(e.target.value)}
                            className="w-20"
                            placeholder="0-100"
                          />
                          <Button
                            size="sm"
                            onClick={() => handleSaveScore(activity.activityId)}
                            disabled={isUpdating}
                          >
                            <Save className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <p className="text-lg font-bold">
                              {activity.score !== null ? `${activity.score}%` : 'N/A'}
                            </p>
                            {activity.score !== null && getScoreBadge(activity.score)}
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditScore(activity.activityId, activity.score)}
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {grade.activities.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                No hay actividades registradas para este estudiante en este curso.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
