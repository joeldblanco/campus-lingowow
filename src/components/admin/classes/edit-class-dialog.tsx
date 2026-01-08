'use client'

import { useState, useEffect } from 'react'
import {
  ClassBookingWithDetails,
  updateClass,
  getAllStudents,
  getAllTeachers,
} from '@/lib/actions/classes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { toast } from 'sonner'
import { EditClassSchema } from '@/schemas/classes'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { useTimezone } from '@/hooks/use-timezone'

interface EditClassDialogProps {
  classItem: ClassBookingWithDetails
  children: React.ReactNode
}

export function EditClassDialog({ classItem, children }: EditClassDialogProps) {
  const { timezone: userTimezone } = useTimezone()
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [students, setStudents] = useState<Array<{ id: string; name: string; lastName: string | null; email: string }>>([])
  const [teachers, setTeachers] = useState<Array<{ id: string; name: string; lastName: string | null; email: string }>>([])
  const form = useForm<z.infer<typeof EditClassSchema>>({
    resolver: zodResolver(EditClassSchema),
    defaultValues: {
      studentId: classItem.studentId,
      teacherId: classItem.teacherId,
      day: classItem.day,
      timeSlot: classItem.timeSlot,
      notes: classItem.notes || '',
    },
  })

  useEffect(() => {
    if (open) {
      loadData()
    }
  }, [open])

  const loadData = async () => {
    try {
      const [studentsData, teachersData] = await Promise.all([getAllStudents(), getAllTeachers()])
      setStudents(studentsData)
      setTeachers(teachersData)
    } catch (error) {
      console.error(error)
      toast.error('Error al cargar los datos')
    }
  }

  const generateTimeSlots = () => {
    const slots = []
    const duration = classItem.enrollment.course.classDuration || 40
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += duration) {
        const startTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        const totalMinutes = hour * 60 + minute + duration
        const endHour = Math.floor(totalMinutes / 60) % 24
        const endMinute = totalMinutes % 60
        const endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`
        slots.push(`${startTime}-${endTime}`)
      }
    }
    return slots
  }

  const onSubmit = async (values: z.infer<typeof EditClassSchema>) => {
    setIsLoading(true)

    try {
      const result = await updateClass(classItem.id, { ...values, timezone: userTimezone })

      if (result.success) {
        toast.success('Clase actualizada exitosamente')
        setOpen(false)
        window.location.reload()
      } else {
        toast.error(result.error || 'Error al actualizar la clase')
      }
    } catch (error) {
      console.error(error)
      toast.error('Error al actualizar la clase')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Clase</DialogTitle>
          <DialogDescription>Modifica la información de la clase.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid gap-4 py-4">
              <FormField
                control={form.control}
                name="studentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estudiante</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {students.map((student) => (
                          <SelectItem key={student.id} value={student.id}>
                            {student.name} {student.lastName} - {student.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="teacherId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Profesor</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {teachers.map((teacher) => (
                          <SelectItem key={teacher.id} value={teacher.id}>
                            {teacher.name} {teacher.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="day"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="timeSlot"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Horario</FormLabel>
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

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notas</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Notas adicionales sobre la clase..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
