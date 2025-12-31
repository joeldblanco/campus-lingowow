'use client'

import { useState, useEffect } from 'react'
import {
  ClassBookingWithDetails,
  rescheduleClass,
  getAvailableTeachers,
} from '@/lib/actions/classes'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
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
import { RescheduleClassSchema } from '@/schemas/classes'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'

interface RescheduleClassDialogProps {
  classItem: ClassBookingWithDetails
  children: React.ReactNode
}

type FormData = z.infer<typeof RescheduleClassSchema>

export function RescheduleClassDialog({ classItem, children }: RescheduleClassDialogProps) {
  const [open, setOpen] = useState(false)
  const [availableTeachers, setAvailableTeachers] = useState<
    Array<{ id: string; name: string; lastName: string; email: string }>
  >([])

  const form = useForm<FormData>({
    resolver: zodResolver(RescheduleClassSchema),
    defaultValues: {
      newDate: classItem.day,
      newTimeSlot: classItem.timeSlot,
      reason: '',
    },
  })

  const watchedDate = form.watch('newDate')
  const watchedTimeSlot = form.watch('newTimeSlot')

  useEffect(() => {
    const checkTeacherAvailability = async () => {
      try {
        const available = await getAvailableTeachers(watchedDate, watchedTimeSlot)
        setAvailableTeachers(available)
      } catch {
        console.error('Error checking teacher availability')
      }
    }

    if (watchedDate && watchedTimeSlot) {
      checkTeacherAvailability()
    }
  }, [watchedDate, watchedTimeSlot])

  const generateTimeSlots = () => {
    const slots = []
    // Solo generar slots que comiencen en horas puntuales (XX:00)
    for (let hour = 8; hour <= 20; hour++) {
      // Solo usar minuto 0 (hora puntual)
      const minute = 0
      const startTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`

      // Obtener la duración real de la clase desde el objeto classItem
      // Si no está disponible, usar 40 minutos como valor predeterminado
      const classDuration = classItem.enrollment?.course?.classDuration || 40 // Duración en minutos

      // Calcular hora y minuto final
      const totalMinutes = hour * 60 + minute + classDuration
      const endHour = Math.floor(totalMinutes / 60)
      const endMinute = totalMinutes % 60
      const endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`

      slots.push(`${startTime}-${endTime}`)
    }
    return slots
  }

  const onSubmit = async (values: FormData) => {
    try {
      const result = await rescheduleClass(classItem.id, values.newDate, values.newTimeSlot)

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
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid gap-4 py-4">
              <FormField
                control={form.control}
                name="newDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nueva Fecha</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        min={(() => {
                          const today = new Date()
                          return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
                        })()}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="newTimeSlot"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nuevo Horario</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {generateTimeSlots().map((slot) => (
                          <SelectItem key={slot} value={slot}>
                            {slot}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {watchedDate && watchedTimeSlot && (
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
                disabled={
                  form.formState.isSubmitting ||
                  (watchedDate && watchedTimeSlot ? !isTeacherAvailable() : false)
                }
              >
                {form.formState.isSubmitting ? 'Reagendando...' : 'Reagendar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
