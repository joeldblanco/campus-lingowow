'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  createClass,
  getStudentsWithPeriods,
  getAvailableTeachers,
  getStudentPeriodByAcademicPeriod,
} from '@/lib/actions/classes'
import { getStudentCredits } from '@/lib/actions/student-credits'
import { getPeriodByDate } from '@/lib/actions/academic-period'
import { getAllCourses } from '@/lib/actions/courses'
import { getTeachersForCourse } from '@/lib/actions/teacher-courses'
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

interface CreateClassDialogProps {
  children: React.ReactNode
}

export function CreateClassDialog({ children }: CreateClassDialogProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [students, setStudents] = useState<
    Array<{
      id: string
      name: string
      lastName: string
      email: string
      studentPeriods: Array<{
        id: string
        period: {
          name: string
          startDate: Date
          endDate: Date
          isActive: boolean
        }
      }>
    }>
  >([])
  const [courses, setCourses] = useState<
    Array<{ id: string; title: string; language: string; level: string }>
  >([])
  const [availableTeachers, setAvailableTeachers] = useState<
    Array<{ id: string; name: string; lastName: string; email: string }>
  >([])
  const [courseTeachers, setCourseTeachers] = useState<
    Array<{ id: string; name: string; lastName: string; email: string }>
  >([])
  const [studentCredits, setStudentCredits] = useState<
    Array<{ id: string; amount: number; isUsed: boolean; source: string }>
  >([])
  const [periodInfo, setPeriodInfo] = useState<{
    academicPeriod: { id: string; name: string } | null
    studentPeriod: {
      id: string
      classesTotal: number
      classesAttended: number
    } | null
    error: string | null
  }>({ academicPeriod: null, studentPeriod: null, error: null })
  const form = useForm<z.infer<typeof CreateClassSchema>>({
    resolver: zodResolver(CreateClassSchema),
    defaultValues: {
      studentId: '',
      teacherId: '',
      day: '',
      timeSlot: '',
      notes: '',
      studentPeriodId: '',
      creditId: '',
      courseId: '',
    },
  })

  const loadData = async () => {
    try {
      const [studentsData, coursesData] = await Promise.all([
        getStudentsWithPeriods(),
        getAllCourses(),
      ])

      setStudents(studentsData)
      setCourses(
        coursesData
          .filter((c) => c.isPublished)
          .map((c) => ({
            id: c.id,
            title: c.title,
            language: c.language,
            level: c.level,
          }))
      )
    } catch {
      console.error('Error loading data')
    }
  }

  const loadStudentCredits = useCallback(async (studentId: string) => {
    try {
      const creditsResult = await getStudentCredits(studentId)
      if (creditsResult.success && creditsResult.credits) {
        setStudentCredits(creditsResult.credits.filter((c) => !c.isUsed))
      }
    } catch {
      toast.error('Error al cargar créditos del estudiante')
    }
  }, [])

  const calculatePeriod = useCallback(async (studentId: string, date: string) => {
    if (!studentId || !date) {
      setPeriodInfo({ academicPeriod: null, studentPeriod: null, error: null })
      return
    }

    try {
      // Buscar el período académico para la fecha
      const periodResult = await getPeriodByDate(date)

      if (!periodResult.success || !periodResult.period) {
        setPeriodInfo({
          academicPeriod: null,
          studentPeriod: null,
          error: periodResult.error || 'No existe un período académico para esta fecha',
        })
        form.setValue('studentPeriodId', '')
        toast.error('No existe un período académico para la fecha seleccionada')
        return
      }

      // Buscar la inscripción del estudiante en ese período
      const studentPeriodResult = await getStudentPeriodByAcademicPeriod(
        studentId,
        periodResult.period.id
      )

      if (!studentPeriodResult.success || !studentPeriodResult.studentPeriod) {
        setPeriodInfo({
          academicPeriod: { id: periodResult.period.id, name: periodResult.period.name },
          studentPeriod: null,
          error: studentPeriodResult.error || 'El estudiante no está inscrito en este período',
        })
        form.setValue('studentPeriodId', '')
        toast.error('El estudiante no está inscrito en el período de esta fecha')
        return
      }

      // Todo correcto, establecer el período
      setPeriodInfo({
        academicPeriod: { id: periodResult.period.id, name: periodResult.period.name },
        studentPeriod: {
          id: studentPeriodResult.studentPeriod.id,
          classesTotal: studentPeriodResult.studentPeriod.classesTotal,
          classesAttended: studentPeriodResult.studentPeriod.classesAttended,
        },
        error: null,
      })
      form.setValue('studentPeriodId', studentPeriodResult.studentPeriod.id)
    } catch (error) {
      console.error('Error calculating period:', error)
      setPeriodInfo({
        academicPeriod: null,
        studentPeriod: null,
        error: 'Error al calcular el período',
      })
      toast.error('Error al calcular el período académico')
    }
  }, [form])

  const loadAvailableTeachers = useCallback(async () => {
    const day = form.watch('day')
    const timeSlot = form.watch('timeSlot')
    try {
      const available = await getAvailableTeachers(day, timeSlot)
      setAvailableTeachers(available)
    } catch {
      toast.error('Error al verificar disponibilidad de profesores')
    }
  }, [form])

  useEffect(() => {
    if (open) {
      loadData()
    }
  }, [open])

  const loadCourseTeachers = useCallback(async (courseId: string) => {
    try {
      const result = await getTeachersForCourse(courseId)
      if (result.success && result.teachers) {
        setCourseTeachers(result.teachers)
      } else {
        setCourseTeachers([])
      }
    } catch {
      toast.error('Error al cargar profesores del curso')
      setCourseTeachers([])
    }
  }, [])

  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'studentId' && value.studentId) {
        loadStudentCredits(value.studentId)
        // Reset dependent fields
        form.setValue('studentPeriodId', '')
        form.setValue('creditId', '')
        setPeriodInfo({ academicPeriod: null, studentPeriod: null, error: null })
        // Recalcular período si ya hay fecha seleccionada
        if (value.day) {
          calculatePeriod(value.studentId, value.day)
        }
      }
      if (name === 'day' && value.day && value.studentId) {
        calculatePeriod(value.studentId, value.day)
      }
      if (name === 'courseId' && value.courseId) {
        loadCourseTeachers(value.courseId)
        // Reset teacher selection
        form.setValue('teacherId', '')
      }
      if ((name === 'day' || name === 'timeSlot') && value.day && value.timeSlot) {
        loadAvailableTeachers()
      }
    })
    return () => subscription.unsubscribe()
  }, [form, loadAvailableTeachers, loadStudentCredits, calculatePeriod, loadCourseTeachers])

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

  const onSubmit = async (values: z.infer<typeof CreateClassSchema>) => {
    setIsLoading(true)

    try {
      // Si el crédito es "no-credit", lo convertimos a undefined
      const submitValues = {
        ...values,
        creditId: values.creditId === 'no-credit' ? undefined : values.creditId,
      }
      const result = await createClass(submitValues)

      if (result.success) {
        toast.success('Clase programada exitosamente')
        setOpen(false)
        form.reset()
        setPeriodInfo({ academicPeriod: null, studentPeriod: null, error: null })
        setStudentCredits([])
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

  const isTeacherAvailable = (teacherId: string) => {
    return availableTeachers.some((t) => t.id === teacherId)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Programar Nueva Clase</DialogTitle>
          <DialogDescription>
            Completa la información para programar una nueva clase.
          </DialogDescription>
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
                          <SelectValue placeholder="Selecciona un estudiante" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {students.length === 0 ? (
                          <SelectItem value="no-students" disabled>
                            No hay estudiantes inscritos en períodos
                          </SelectItem>
                        ) : (
                          students.map((student) => {
                            const activePeriod = student.studentPeriods.find((sp) => sp.period.isActive)
                            const periodCount = student.studentPeriods.length
                            return (
                              <SelectItem key={student.id} value={student.id}>
                                {student.name} {student.lastName}
                                {activePeriod && (
                                  <span className="text-xs text-muted-foreground">
                                    {' '}
                                    - {activePeriod.period.name}
                                  </span>
                                )}
                                {!activePeriod && periodCount > 0 && (
                                  <span className="text-xs text-muted-foreground">
                                    {' '}
                                    - {periodCount} período{periodCount > 1 ? 's' : ''}
                                  </span>
                                )}
                              </SelectItem>
                            )
                          })
                        )}
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
                      <Input
                        type="date"
                        min={new Date().toISOString().split('T')[0]}
                        {...field}
                      />
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
                          <SelectValue placeholder="Selecciona un horario" />
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

              {periodInfo.academicPeriod && periodInfo.studentPeriod && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                  <p className="text-sm font-medium text-green-900">
                    Período: {periodInfo.academicPeriod.name}
                  </p>
                  <p className="text-xs text-green-700">
                    Progreso: {periodInfo.studentPeriod.classesAttended}/{periodInfo.studentPeriod.classesTotal} clases
                  </p>
                </div>
              )}

              {periodInfo.error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                  <p className="text-sm font-medium text-red-900">⚠️ {periodInfo.error}</p>
                  <p className="text-xs text-red-700 mt-1">
                    Verifica que el estudiante esté inscrito en un período que incluya esta fecha.
                  </p>
                </div>
              )}

              <FormField
                control={form.control}
                name="studentPeriodId"
                render={({ field }) => (
                  <FormItem className="hidden">
                    <FormControl>
                      <Input type="hidden" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="creditId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Crédito (opcional)</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={!form.watch('studentId')}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sin crédito" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="no-credit">Sin crédito</SelectItem>
                        {studentCredits.map((credit) => (
                          <SelectItem key={credit.id} value={credit.id}>
                            {credit.source} - {credit.amount} crédito(s)
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
                name="courseId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Curso</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un curso" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {courses.length === 0 ? (
                          <SelectItem value="no-courses" disabled>
                            No hay cursos disponibles
                          </SelectItem>
                        ) : (
                          courses.map((course) => (
                            <SelectItem key={course.id} value={course.id}>
                              {course.title} ({course.language} - {course.level})
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
                name="teacherId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Profesor</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={!form.watch('courseId')}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={!form.watch('courseId') ? "Primero selecciona un curso" : "Selecciona un profesor"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {!form.watch('courseId') ? (
                          <SelectItem value="no-course-selected" disabled>
                            Selecciona un curso primero
                          </SelectItem>
                        ) : courseTeachers.length === 0 ? (
                          <SelectItem value="no-teachers" disabled>
                            No hay profesores asignados a este curso
                          </SelectItem>
                        ) : (
                          courseTeachers.map((teacher) => {
                            const hasDateTime = !!form.watch('day') && !!form.watch('timeSlot')
                            const isAvailable = hasDateTime ? isTeacherAvailable(teacher.id) : true
                            const isDisabled = hasDateTime && !isAvailable
                            return (
                              <SelectItem
                                key={teacher.id}
                                value={teacher.id}
                                disabled={isDisabled}
                              >
                                {teacher.name} {teacher.lastName}
                                {form.watch('day') &&
                                  form.watch('timeSlot') &&
                                  !isAvailable &&
                                  ' (No disponible)'}
                              </SelectItem>
                            )
                          })
                        )}
                      </SelectContent>
                    </Select>
                    {form.watch('courseId') && courseTeachers.length === 0 && (
                      <p className="text-sm text-amber-600">
                        No hay profesores asignados a este curso. Asigna profesores desde la gestión de usuarios.
                      </p>
                    )}
                    {form.watch('day') && form.watch('timeSlot') && form.watch('courseId') && courseTeachers.length > 0 && availableTeachers.length === 0 && (
                      <p className="text-sm text-red-600">
                        No hay profesores disponibles en este horario
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
                {isLoading ? 'Programando...' : 'Programar Clase'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
