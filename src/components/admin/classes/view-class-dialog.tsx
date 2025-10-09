'use client'

import { useState } from 'react'
import { ClassBookingWithDetails } from '@/lib/actions/classes'
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
import { Calendar, Clock, User, GraduationCap, FileText } from 'lucide-react'

interface ViewClassDialogProps {
  classItem: ClassBookingWithDetails
  children: React.ReactNode
}

export function ViewClassDialog({ classItem, children }: ViewClassDialogProps) {
  const [open, setOpen] = useState(false)

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return <Badge variant="default">Confirmada</Badge>
      case 'COMPLETED':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Completada</Badge>
      case 'CANCELLED':
        return <Badge variant="destructive">Cancelada</Badge>
      case 'NO_SHOW':
        return <Badge variant="outline" className="border-orange-500 text-orange-700">No asistió</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    // dateString viene como YYYY-MM-DD, lo mostramos en formato local
    const [year, month, day] = dateString.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const formatDateTime = (date: Date | string) => {
    // Las fechas DateTime vienen en UTC, las mostramos en hora local
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return dateObj.toLocaleString('es-ES')
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Detalles de la Clase
          </DialogTitle>
          <DialogDescription>
            Información completa de la clase programada
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Status and Basic Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              {getStatusBadge(classItem.status)}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Fecha
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-medium">{formatDate(classItem.day)}</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Horario
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-medium">{classItem.timeSlot}</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Participants */}
          <div className="space-y-4">
            <h4 className="font-medium">Participantes</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <GraduationCap className="h-4 w-4" />
                    Estudiante
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div>
                    <p className="font-medium">
                      {classItem.student.name} {classItem.student.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {classItem.student.email}
                    </p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Profesor
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div>
                    <p className="font-medium">
                      {classItem.teacher.name} {classItem.teacher.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {classItem.teacher.email}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Course and Period Information */}
          {classItem.enrollment && (
            <div>
              <h4 className="font-medium mb-3">Información del Curso</h4>
              <Card>
                <CardContent className="pt-4">
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm font-medium">Curso</p>
                      <p className="text-sm text-muted-foreground">
                        {classItem.enrollment.course.title} ({classItem.enrollment.course.language} - {classItem.enrollment.course.level})
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Período Académico</p>
                      <p className="text-sm text-muted-foreground">
                        {classItem.enrollment.academicPeriod.name}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Progreso de Clases</p>
                      <p className="text-sm text-muted-foreground">
                        {classItem.enrollment.classesAttended}/{classItem.enrollment.classesTotal} clases completadas
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Duración del Período</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(classItem.enrollment.academicPeriod.startDate.toString())} - {formatDate(classItem.enrollment.academicPeriod.endDate.toString())}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Notes */}
          {classItem.notes && (
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Notas
              </h4>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-sm">{classItem.notes}</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Timestamps */}
          <div>
            <h4 className="font-medium mb-3">Información de Seguimiento</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Creada:</span>
                <span>{formatDateTime(classItem.createdAt.toString())}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Última actualización:</span>
                <span>{formatDateTime(classItem.updatedAt.toString())}</span>
              </div>
              {classItem.completedAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Completada:</span>
                  <span>{formatDateTime(classItem.completedAt.toString())}</span>
                </div>
              )}
              {classItem.cancelledAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cancelada:</span>
                  <span>{formatDateTime(classItem.cancelledAt.toString())}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Recordatorio enviado:</span>
                <span>{classItem.reminderSent ? 'Sí' : 'No'}</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
