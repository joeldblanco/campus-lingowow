'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, Users, Target, BookOpen } from 'lucide-react'
import { ExamWithDetails } from '@/types/exam'

interface ViewExamDialogProps {
  exam: ExamWithDetails
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ViewExamDialog({ exam, open, onOpenChange }: ViewExamDialogProps) {
  const totalQuestions = exam.questions?.length || 0
  const totalAttempts = exam.attempts.length
  const passedAttempts = exam.attempts.filter(
    (attempt) =>
      attempt.status === 'COMPLETED' && (attempt.score || 0) >= exam.passingScore
  ).length
  const passRate = totalAttempts > 0 ? Math.round((passedAttempts / totalAttempts) * 100) : 0

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="flex items-center space-x-2">
            <span>{exam.title}</span>
            <Badge variant={exam.isPublished ? 'default' : 'secondary'}>
              {exam.isPublished ? 'Publicado' : 'Borrador'}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Exam Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Detalles del Examen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Descripción</h4>
                <p className="text-muted-foreground">{exam.description}</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Duración</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDuration(exam.timeLimit || 0)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Puntaje Mínimo</p>
                    <p className="text-sm text-muted-foreground">
                      {exam.passingScore}%
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-3">
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Preguntas</p>
                    <p className="text-sm text-muted-foreground">{totalQuestions}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Intentos Máximos</p>
                    <p className="text-sm text-muted-foreground">{exam.maxAttempts}</p>
                  </div>
                </div>
              </div>

              {exam.course && (
                <div>
                  <h4 className="font-medium mb-2">Asignación de Curso</h4>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">{exam.course.title}</Badge>
                    <Badge variant="secondary">{exam.course.language}</Badge>
                    <Badge variant="secondary">{exam.course.level}</Badge>
                  </div>
                  {exam.module && (
                    <div className="mt-2">
                      <span className="text-sm text-muted-foreground">
                        Módulo: {exam.module.title} (Nivel {exam.module.level})
                      </span>
                    </div>
                  )}
                  {exam.lesson && (
                    <div className="mt-1">
                      <span className="text-sm text-muted-foreground">
                        Lección: {exam.lesson.title}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Estadísticas de Rendimiento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{totalAttempts}</div>
                  <p className="text-sm text-muted-foreground">Intentos Totales</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{passedAttempts}</div>
                  <p className="text-sm text-muted-foreground">Aprobados</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {totalAttempts - passedAttempts}
                  </div>
                  <p className="text-sm text-muted-foreground">Reprobados</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{passRate}%</div>
                  <p className="text-sm text-muted-foreground">Tasa de Aprobación</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Questions */}
          {exam.questions && exam.questions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Preguntas del Examen</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">Contenido del Examen</h4>
                    <div className="flex space-x-2">
                      <Badge variant="outline">{exam.questions.length} preguntas</Badge>
                      <Badge variant="outline">
                        {exam.questions.reduce((sum, q) => sum + q.points, 0)} puntos
                      </Badge>
                    </div>
                  </div>

                  {/* Group questions by groupId */}
                  <div className="space-y-3">
                    {(() => {
                      // Extract groupId and original block type from question options
                      const questionsWithGroup = exam.questions.map(q => {
                        let groupId: string | null = null
                        let originalType: string | null = null
                        try {
                          if (q.options) {
                            const options = typeof q.options === 'string' ? JSON.parse(q.options as string) : q.options
                            groupId = (options as Record<string, unknown>)?.groupId as string || null
                            originalType = (options as Record<string, unknown>)?.originalBlockType as string || null
                          }
                        } catch {
                          // Ignore parsing errors
                        }
                        return { ...q, groupId, originalType }
                      })

                      // Group questions by groupId
                      const groupedQuestions = questionsWithGroup.reduce((acc, question) => {
                        const key = question.groupId || 'ungrouped'
                        if (!acc[key]) {
                          acc[key] = []
                        }
                        acc[key].push(question)
                        return acc
                      }, {} as Record<string, typeof questionsWithGroup>)

                      return Object.entries(groupedQuestions).map(([groupKey, questions], idx) => {
                        const isGrouped = groupKey !== 'ungrouped'
                        const totalPoints = questions.reduce((sum, q) => sum + q.points, 0)
                        
                        // Get display types, prioritizing original block types
                        const typeMap: Record<string, string> = {
                          'MULTIPLE_CHOICE': 'Opción Múltiple',
                          'TRUE_FALSE': 'Verdadero Falso',
                          'SHORT_ANSWER': 'Respuesta Corta',
                          'ESSAY': 'Ensayo',
                          'FILL_BLANK': 'Completar Espacio',
                          'MATCHING': 'Relacionar',
                          'ORDERING': 'Ordenar',
                          'DRAG_DROP': 'Arrastrar Soltar'
                        }
                        const questionTypes = [...new Set(questions.map(q => {
                          if (q.originalType === 'recording') return 'Grabación'
                          if (q.originalType === 'audio') return 'Audio'
                          return typeMap[q.type] || q.type.replace('_', ' ')
                        }))]

                        return (
                          <div key={groupKey} className="border rounded-lg p-3 bg-muted/30">
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="font-medium text-sm">
                                {isGrouped ? `Grupo ${idx + 1}` : 'Preguntas individuales'}
                              </h5>
                              <div className="flex space-x-2">
                                <Badge variant="secondary" className="text-xs">
                                  {questions.length} {questions.length === 1 ? 'pregunta' : 'preguntas'}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {totalPoints} ptos
                                </Badge>
                              </div>
                            </div>
                            
                            <div className="flex flex-wrap gap-1">
                              {questionTypes.map(type => (
                                <Badge key={type} variant="outline" className="text-xs">
                                  {type}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )
                      })
                    })()}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

                  </div>

        <div className="p-6 pt-4 border-t flex justify-end">
          <Button onClick={() => onOpenChange(false)}>Cerrar</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
