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
import { getModuleById } from '@/lib/actions/modules'
import { toast } from 'sonner'
import { ModuleViewPayload } from '@/types/module'

interface ViewUnitDialogProps {
  children: React.ReactNode
  unitId: string
}

export function ViewUnitDialog({ children, unitId }: ViewUnitDialogProps) {
  const [open, setOpen] = useState(false)
  const [unit, setUnit] = useState<ModuleViewPayload | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const loadUnit = async () => {
      if (!open || !unitId) return

      try {
        setIsLoading(true)
        const unitData = await getModuleById(unitId)
        setUnit(unitData)
      } catch (error) {
        console.error('Error loading unit:', error)
        toast.error('Error al cargar la unidad')
      } finally {
        setIsLoading(false)
      }
    }

    loadUnit()
  }, [open, unitId])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalles de la Unidad</DialogTitle>
          <DialogDescription>
            Información completa de la unidad y su contenido.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : unit ? (
          <div className="space-y-6">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    {unit.title}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Badge variant={unit.isPublished ? 'default' : 'secondary'}>
                      {unit.isPublished ? 'Publicada' : 'Borrador'}
                    </Badge>
                    <Badge variant="outline">
                      Nivel {unit.level}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Curso</h4>
                  <p className="text-sm text-muted-foreground">{unit.course.title}</p>
                </div>

                {unit.description && (
                  <div>
                    <h4 className="font-medium mb-2">Descripción</h4>
                    <p className="text-sm text-muted-foreground">{unit.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Orden:</span> {unit.order}
                  </div>
                  <div>
                    <span className="font-medium">Creada:</span>{' '}
                    {new Date(unit.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Lessons */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Lecciones ({unit.lessons?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {unit.lessons && unit.lessons.length > 0 ? (
                  <div className="space-y-2">
                    {unit.lessons.map((lesson) => (
                      <div
                        key={lesson.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div>
                          <h5 className="font-medium">{lesson.title}</h5>
                          <p className="text-sm text-muted-foreground">
                            Orden: {lesson.order}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No hay lecciones asignadas a esta unidad.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Activities */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Actividades ({unit.activities?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {unit.activities && unit.activities.length > 0 ? (
                  <div className="space-y-2">
                    {unit.activities.map((moduleActivity) => (
                      <div
                        key={moduleActivity.activity.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div>
                          <h5 className="font-medium">{moduleActivity.activity.title}</h5>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {moduleActivity.activity.activityType}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {moduleActivity.activity.points} XP
                            </span>
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Orden: {moduleActivity.order}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No hay actividades asignadas a esta unidad.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No se pudo cargar la información de la unidad.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
