'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ClassBookingWithDetails,
  rescheduleClass,
  getAvailableTeachers,
  getTeacherAvailableTimeSlots,
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
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [availableTeachers, setAvailableTeachers] = useState<
    Array<{ id: string; name: string; lastName: string | null; email: string }>
  >([])
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([])

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
    const fetchAvailableTimeSlots = async () => {
      try {
        const courseId = classItem.enrollment?.course?.id
        if (courseId) {
          const slots = await getTeacherAvailableTimeSlots(
            classItem.teacherId,
            watchedDate,
            courseId
          )
          setAvailableTimeSlots(slots)
          // Si el slot actual no está en los disponibles, limpiar la selección
          if (slots.length > 0 && !slots.includes(form.getValues('newTimeSlot'))) {
            form.setValue('newTimeSlot', '')
          }
        }
      } catch {
        console.error('Error fetching available time slots')
        setAvailableTimeSlots([])
      }
    }

    if (watchedDate) {
      fetchAvailableTimeSlots()
    }
  }, [watchedDate, classItem.teacherId, classItem.enrollment?.course?.id, form])

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

  const onSubmit = async (values: FormData) => {
    try {
      const result = await rescheduleClass(classItem.id, values.newDate, values.newTimeSlot)

      if (result.success) {
        toast.success('Clase reagendada exitosamente')
        setOpen(false)
        router.refresh()
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
                        {availableTimeSlots.length > 0 ? (
                          availableTimeSlots.map((slot) => (
                            <SelectItem key={slot} value={slot}>
                              {slot}
                            </SelectItem>
                          ))
                        ) : (
                          <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                            No hay horarios disponibles para este día
                          </div>
                        )}
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
