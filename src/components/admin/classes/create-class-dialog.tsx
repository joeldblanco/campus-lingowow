'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClass, getEnrollmentsWithTeachers } from '@/lib/actions/classes'
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
import { CreateClassSchema } from '@/schemas/classes'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { useTimezone } from '@/hooks/use-timezone'
import { Search } from 'lucide-react'

interface EnrollmentWithTeachers {
  id: string
  classesTotal: number
  classesAttended: number
  student: {
    id: string
    name: string
    lastName: string | null
    email: string
  }
  course: {
    id: string
    title: string
    language: string
    level: string
    classDuration: number | null
  }
  academicPeriod: {
    id: string
    name: string
    startDate: Date
    endDate: Date
    isActive: boolean
  }
  teachers: Array<{
    id: string
    name: string
    lastName: string | null
    email: string
  }>
}

interface CreateClassDialogProps {
  children: React.ReactNode
}

export function CreateClassDialog({ children }: CreateClassDialogProps) {
  const { timezone: userTimezone } = useTimezone()
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [enrollments, setEnrollments] = useState<EnrollmentWithTeachers[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedEnrollment, setSelectedEnrollment] = useState<EnrollmentWithTeachers | null>(null)

  const form = useForm<z.infer<typeof CreateClassSchema>>({
    resolver: zodResolver(CreateClassSchema),
    defaultValues: {
      enrollmentId: '',
      teacherId: '',
      datetime: '',
      notes: '',
    },
  })

  const loadData = async () => {
    try {
      const data = await getEnrollmentsWithTeachers()
      setEnrollments(data)
    } catch {
      console.error('Error loading enrollments')
      toast.error('Error al cargar inscripciones')
    }
  }

  useEffect(() => {
    if (open) {
      loadData()
      setSearchQuery('')
      setSelectedEnrollment(null)
      form.reset()
    }
  }, [open, form])

  const filteredEnrollments = useMemo(() => {
    if (!searchQuery.trim()) return enrollments

    const query = searchQuery.toLowerCase()
    return enrollments.filter((enrollment) => {
      const studentName = `${enrollment.student.name} ${enrollment.student.lastName || ''}`.toLowerCase()
      const studentEmail = enrollment.student.email.toLowerCase()
      const courseTitle = enrollment.course.title.toLowerCase()
      const courseLanguage = enrollment.course.language.toLowerCase()
      const periodName = enrollment.academicPeriod.name.toLowerCase()
      const teacherNames = enrollment.teachers
        .map((t) => `${t.name} ${t.lastName || ''}`.toLowerCase())
        .join(' ')

      return (
        studentName.includes(query) ||
        studentEmail.includes(query) ||
        courseTitle.includes(query) ||
        courseLanguage.includes(query) ||
        periodName.includes(query) ||
        teacherNames.includes(query)
      )
    })
  }, [enrollments, searchQuery])

  const handleEnrollmentChange = (enrollmentId: string) => {
    const enrollment = enrollments.find((e) => e.id === enrollmentId)
    setSelectedEnrollment(enrollment || null)
    form.setValue('enrollmentId', enrollmentId)
    form.setValue('teacherId', '')
  }

  const onSubmit = async (values: z.infer<typeof CreateClassSchema>) => {
    setIsLoading(true)

    try {
      const result = await createClass({
        ...values,
        timezone: userTimezone,
      })

      if (result.success) {
        toast.success('Clase programada exitosamente')
        setOpen(false)
        form.reset()
        setSelectedEnrollment(null)
        window.location.reload()
      } else {
        toast.error(result.error || 'Error al programar la clase')
      }
    } catch {
      console.error('Error creating class')
      toast.error('Error al crear la clase')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Programar Nueva Clase</DialogTitle>
          <DialogDescription>
            Selecciona una inscripción y programa la fecha y hora de la clase.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Buscar inscripción</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por estudiante, curso o profesor..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <FormField
                control={form.control}
                name="enrollmentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Inscripción</FormLabel>
                    <Select onValueChange={handleEnrollmentChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona una inscripción" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-[300px]">
                        {filteredEnrollments.length === 0 ? (
                          <SelectItem value="no-enrollments" disabled>
                            {searchQuery ? 'No se encontraron inscripciones' : 'No hay inscripciones activas'}
                          </SelectItem>
                        ) : (
                          filteredEnrollments.map((enrollment) => (
                            <SelectItem key={enrollment.id} value={enrollment.id}>
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {enrollment.student.name} {enrollment.student.lastName}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {enrollment.course.title} ({enrollment.course.language}) - {enrollment.academicPeriod.name}
                                </span>
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedEnrollment && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 space-y-1">
                  <p className="text-sm font-medium text-blue-900">
                    {selectedEnrollment.student.name} {selectedEnrollment.student.lastName}
                  </p>
                  <p className="text-xs text-blue-700">
                    {selectedEnrollment.course.title} ({selectedEnrollment.course.language} - {selectedEnrollment.course.level})
                  </p>
                  <p className="text-xs text-blue-700">
                    Período: {selectedEnrollment.academicPeriod.name}
                  </p>
                  <p className="text-xs text-blue-700">
                    Progreso: {selectedEnrollment.classesAttended}/{selectedEnrollment.classesTotal} clases
                  </p>
                  {selectedEnrollment.teachers.length === 0 && (
                    <p className="text-xs text-amber-600 mt-2">
                      ⚠️ No hay profesores asignados a este curso
                    </p>
                  )}
                </div>
              )}

              <FormField
                control={form.control}
                name="teacherId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Profesor</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={!selectedEnrollment}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              !selectedEnrollment
                                ? 'Primero selecciona una inscripción'
                                : 'Selecciona un profesor'
                            }
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {!selectedEnrollment ? (
                          <SelectItem value="no-enrollment" disabled>
                            Selecciona una inscripción primero
                          </SelectItem>
                        ) : selectedEnrollment.teachers.length === 0 ? (
                          <SelectItem value="no-teachers" disabled>
                            No hay profesores asignados a este curso
                          </SelectItem>
                        ) : (
                          selectedEnrollment.teachers.map((teacher) => (
                            <SelectItem key={teacher.id} value={teacher.id}>
                              {teacher.name} {teacher.lastName}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="datetime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha y Hora</FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        {...field}
                        disabled={!selectedEnrollment}
                      />
                    </FormControl>
                    {selectedEnrollment && (
                      <p className="text-xs text-muted-foreground">
                        Duración de clase: {selectedEnrollment.course.classDuration || 40} minutos
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notas (opcional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Notas adicionales sobre la clase..." {...field} />
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
                {isLoading ? 'Programando...' : 'Programar Clase'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
