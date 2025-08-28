'use client'

import { useState, useEffect } from 'react'
import {
  ClassBookingWithDetails,
  rescheduleClass,
  getAvailableTeachers,
} from '@/lib/actions/classes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

interface RescheduleClassDialogProps {
  classItem: ClassBookingWithDetails
  children: React.ReactNode
}

export function RescheduleClassDialog({ classItem, children }: RescheduleClassDialogProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [availableTeachers, setAvailableTeachers] = useState<Array<{ id: string; name: string; lastName: string; email: string }>>([])
  const [formData, setFormData] = useState({
    day: classItem.day,
    timeSlot: classItem.timeSlot,
  })

  useEffect(() => {
    const checkTeacherAvailability = async () => {
      try {
        const available = await getAvailableTeachers(formData.day, formData.timeSlot)
        setAvailableTeachers(available)
      } catch {
        console.error('Error checking teacher availability')
      }
    }

    if (formData.day && formData.timeSlot) {
      checkTeacherAvailability()
    }
  }, [formData.day, formData.timeSlot])

  const generateTimeSlots = () => {
    const slots = []
    for (let hour = 8; hour <= 20; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const startTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        const endHour = minute === 30 ? hour + 1 : hour
        const endMinute = minute === 30 ? 0 : 30
        const endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`
        slots.push(`${startTime}-${endTime}`)
      }
    }
    return slots
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const result = await rescheduleClass(classItem.id, formData.day, formData.timeSlot)

      if (result.success) {
        toast.success('Clase reagendada exitosamente')
        setOpen(false)
        window.location.reload()
      } else {
        toast.error(result.error || 'Error al reagendar la clase')
      }
    } catch (error) {
      console.error(error)
      toast.error('Error al reagendar la clase')
    } finally {
      setIsLoading(false)
    }
  }

  const isTeacherAvailable = () => {
    return availableTeachers.some((t) => t.id === classItem.teacherId)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Reagendar Clase</DialogTitle>
          <DialogDescription>
            Selecciona una nueva fecha y horario para la clase con {classItem.teacher.name}{' '}
            {classItem.teacher.lastName}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="day">Nueva Fecha</Label>
              <Input
                id="day"
                type="date"
                value={formData.day}
                onChange={(e) => setFormData({ ...formData, day: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="timeSlot">Nuevo Horario</Label>
              <Select
                value={formData.timeSlot}
                onValueChange={(value) => setFormData({ ...formData, timeSlot: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {generateTimeSlots().map((slot) => (
                    <SelectItem key={slot} value={slot}>
                      {slot}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.day && formData.timeSlot && (
              <div className="p-3 border rounded-lg">
                {isTeacherAvailable() ? (
                  <p className="text-sm text-green-600">
                    ✓ El profesor {classItem.teacher.name} está disponible en este horario
                  </p>
                ) : (
                  <p className="text-sm text-red-600">
                    ✗ El profesor {classItem.teacher.name} no está disponible en este horario
                  </p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading || (formData.day && formData.timeSlot ? !isTeacherAvailable() : false)}
            >
              {isLoading ? 'Reagendando...' : 'Reagendar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
