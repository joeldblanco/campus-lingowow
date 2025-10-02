'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useState } from 'react'

interface Enrollment {
  id: string
  course: {
    id: string
    title: string
    description: string
    level: string
  }
  academicPeriod: {
    id: string
    name: string
    isActive: boolean
  }
}

interface BookingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  enrollments: Enrollment[]
  onConfirm: (enrollmentId: string) => void
  bookingDetails: {
    day: string
    timeSlot: string
    duration: string
  }
}

export function BookingDialog({
  open,
  onOpenChange,
  enrollments,
  onConfirm,
  bookingDetails,
}: BookingDialogProps) {
  const [selectedEnrollment, setSelectedEnrollment] = useState<string>('')

  const handleConfirm = () => {
    if (selectedEnrollment) {
      onConfirm(selectedEnrollment)
      setSelectedEnrollment('')
    }
  }

  const handleCancel = () => {
    setSelectedEnrollment('')
    onOpenChange(false)
  }

  // Formatear el día para mostrar
  const formatDay = (day: string) => {
    const days: Record<string, string> = {
      monday: 'Lunes',
      tuesday: 'Martes',
      wednesday: 'Miércoles',
      thursday: 'Jueves',
      friday: 'Viernes',
      saturday: 'Sábado',
      sunday: 'Domingo',
    }
    return days[day.toLowerCase()] || day
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reservar Clase</DialogTitle>
          <DialogDescription>
            Selecciona el curso para el cual deseas reservar esta clase.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Detalles de la reserva</Label>
            <div className="rounded-lg border p-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Día:</span>
                <span className="font-medium">{formatDay(bookingDetails.day)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Horario:</span>
                <span className="font-medium">{bookingDetails.timeSlot}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Duración:</span>
                <span className="font-medium">{bookingDetails.duration}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="enrollment">Curso</Label>
            {enrollments.length === 0 ? (
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
                <p className="font-medium">No tienes cursos activos</p>
                <p className="mt-1 text-xs">
                  Debes estar inscrito en un curso activo para poder reservar clases.
                </p>
              </div>
            ) : (
              <Select value={selectedEnrollment} onValueChange={setSelectedEnrollment}>
                <SelectTrigger id="enrollment">
                  <SelectValue placeholder="Selecciona un curso" />
                </SelectTrigger>
                <SelectContent>
                  {enrollments.map((enrollment) => (
                    <SelectItem key={enrollment.id} value={enrollment.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{enrollment.course.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {enrollment.course.level} • {enrollment.academicPeriod.name}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedEnrollment || enrollments.length === 0}>
            Confirmar Reserva
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
