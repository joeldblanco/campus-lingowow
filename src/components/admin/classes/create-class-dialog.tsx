'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  createClass,
  getStudentsWithEnrollments,
  getTeacherAvailableTimeSlots,
  getTeacherAvailableDays,
} from '@/lib/actions/classes'
import { getStudentCredits } from '@/lib/actions/student-credits'
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
import { formatDateLong } from '@/lib/utils/date'
import { useTimezone } from '@/hooks/use-timezone'

interface CreateClassDialogProps {
  children: React.ReactNode
}

export function CreateClassDialog({ children }: CreateClassDialogProps) {
  const { timezone: userTimezone } = useTimezone()
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [students, setStudents] = useState<
    Array<{
      id: string
      name: string
      lastName: string | null
      email: string
      enrollments: Array<{
        id: string
        courseId: string
        academicPeriodId: string
        classesTotal: number
        classesAttended: number
        course: {
          id: string
          title: string
          language: string
          level: string
        }
        academicPeriod: {
          id: string
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
  const [courseTeachers, setCourseTeachers] = useState<
    Array<{ id: string; name: string; lastName: string | null; email: string }>
  >([])
  const [teacherAvailableSlots, setTeacherAvailableSlots] = useState<string[]>([])
  const [teacherAvailableDays, setTeacherAvailableDays] = useState<string[]>([])
  const [studentCredits, setStudentCredits] = useState<
    Array<{ id: string; amount: number; isUsed: boolean; source: string }>
  >([])
  const [enrollmentInfo, setEnrollmentInfo] = useState<{
    enrollment: {
      id: string
      courseId: string
      academicPeriodId: string
      classesTotal: number
      classesAttended: number
      course: { title: string }
      academicPeriod: {
        name: string
        startDate: Date
        endDate: Date
      }
    } | null
    error: string | null
  }>({ enrollment: null, error: null })
  const form = useForm<z.infer<typeof CreateClassSchema>>({
    resolver: zodResolver(CreateClassSchema),
    defaultValues: {
      studentId: '',
      courseId: '',
      enrollmentId: '',
      teacherId: '',
      day: '',
      timeSlot: '',
      notes: '',
      creditId: 'no-credit',
    },
  })

  const loadData = async () => {
    try {
      const studentsData = await getStudentsWithEnrollments()

      setStudents(studentsData)

      // Extraer cursos únicos de las inscripciones
      const uniqueCourses = new Map()
      studentsData.forEach((student) => {
        student.enrollments.forEach((enrollment) => {
          if (!uniqueCourses.has(enrollment.course.id)) {
            uniqueCourses.set(enrollment.course.id, enrollment.course)
          }
        })
      })
      setCourses(Array.from(uniqueCourses.values()))
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

  const findEnrollment = useCallback(
    (studentId: string, courseId: string) => {
      if (!studentId || !courseId) {
        setEnrollmentInfo({ enrollment: null, error: null })
        return
      }

      const student = students.find((s) => s.id === studentId)
      if (!student) {
        setEnrollmentInfo({ enrollment: null, error: 'Estudiante no encontrado' })
        return
      }

      const enrollment = student.enrollments.find((e) => e.courseId === courseId)
      if (!enrollment) {
        setEnrollmentInfo({
          enrollment: null,
          error: 'El estudiante no está inscrito en este curso',
        })
        form.setValue('enrollmentId', '')
        toast.error('El estudiante no está inscrito en este curso')
        return
      }

      // Mapear el enrollment con las fechas del período académico
      const mappedEnrollment = {
        id: enrollment.id,
        courseId: enrollment.courseId,
        academicPeriodId: enrollment.academicPeriodId,
        classesTotal: enrollment.classesTotal,
        classesAttended: enrollment.classesAttended,
        course: enrollment.course,
        academicPeriod: {
          name: enrollment.academicPeriod.name,
          startDate: enrollment.academicPeriod.startDate,
          endDate: enrollment.academicPeriod.endDate,
        },
      }

      setEnrollmentInfo({ enrollment: mappedEnrollment, error: null })
      form.setValue('enrollmentId', enrollment.id)
    },
    [students, form]
  )

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

  const loadTeacherAvailableDays = useCallback(async () => {
    const teacherId = form.watch('teacherId')

    if (!teacherId || !enrollmentInfo.enrollment) {
      setTeacherAvailableDays([])
      return
    }

    try {
      const periodStart = new Date(enrollmentInfo.enrollment.academicPeriod.startDate)
      const periodEnd = new Date(enrollmentInfo.enrollment.academicPeriod.endDate)

      const periodStartStr = periodStart.toISOString().split('T')[0]
      const periodEndStr = periodEnd.toISOString().split('T')[0]

      const startDate = periodStartStr
      const endDate = periodEndStr

      const days = await getTeacherAvailableDays(teacherId, startDate, endDate)
      setTeacherAvailableDays(days)
    } catch (error) {
      console.error('Error al cargar días disponibles:', error)
      toast.error('Error al cargar días disponibles del profesor')
      setTeacherAvailableDays([])
    }
  }, [form, enrollmentInfo])

  const loadTeacherAvailableSlots = useCallback(async () => {
    const teacherId = form.watch('teacherId')
    const day = form.watch('day')
    const courseId = form.watch('courseId')

    if (!teacherId || !day || !courseId) {
      setTeacherAvailableSlots([])
      return
    }

    try {
      const slots = await getTeacherAvailableTimeSlots(teacherId, day, courseId)
      setTeacherAvailableSlots(slots)
    } catch (error) {
      console.error('Error al cargar horarios disponibles:', error)
      toast.error('Error al cargar horarios disponibles del profesor')
      setTeacherAvailableSlots([])
    }
  }, [form])

  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'studentId' && value.studentId) {
        loadStudentCredits(value.studentId)
        // Reset dependent fields
        form.setValue('enrollmentId', '')
        form.setValue('creditId', 'no-credit')
        setEnrollmentInfo({ enrollment: null, error: null })
      }
      if ((name === 'studentId' || name === 'courseId') && value.studentId && value.courseId) {
        findEnrollment(value.studentId, value.courseId)
      }
      if (name === 'courseId' && value.courseId) {
        loadCourseTeachers(value.courseId)
        // Reset teacher selection
        form.setValue('teacherId', '')
        form.setValue('day', '')
        form.setValue('timeSlot', '')
        setTeacherAvailableDays([])
        setTeacherAvailableSlots([])
      }
      if (name === 'teacherId' && value.teacherId) {
        loadTeacherAvailableDays()
        // Reset day and timeSlot when teacher changes
        form.setValue('day', '')
        form.setValue('timeSlot', '')
      }
      if (name === 'day' && value.day && value.teacherId) {
        loadTeacherAvailableSlots()
        // Reset timeSlot when day changes
        form.setValue('timeSlot', '')
      }
    })
    return () => subscription.unsubscribe()
  }, [
    form,
    loadStudentCredits,
    findEnrollment,
    loadCourseTeachers,
    loadTeacherAvailableDays,
    loadTeacherAvailableSlots,
  ])

  const onSubmit = async (values: z.infer<typeof CreateClassSchema>) => {
    setIsLoading(true)

    try {
      // Si el crédito es "no-credit" o está vacío, lo convertimos a undefined
      const submitValues = {
        ...values,
        creditId: values.creditId === 'no-credit' || !values.creditId ? undefined : values.creditId,
        timezone: userTimezone,
      }
      const result = await createClass(submitValues)

      if (result.success) {
        toast.success('Clase programada exitosamente')
        setOpen(false)
        form.reset()
        setEnrollmentInfo({ enrollment: null, error: null })
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
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
                            No hay estudiantes con inscripciones activas
                          </SelectItem>
                        ) : (
                          students.map((student) => (
                            <SelectItem key={student.id} value={student.id}>
                              {student.name} {student.lastName}
                              <span className="text-xs text-muted-foreground">
                                {' '}
                                - {student.enrollments.length} inscripción
                                {student.enrollments.length > 1 ? 'es' : ''}
                              </span>
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
                name="courseId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Curso</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={!form.watch('studentId')}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              !form.watch('studentId')
                                ? 'Primero selecciona un estudiante'
                                : 'Selecciona un curso'
                            }
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {!form.watch('studentId') ? (
                          <SelectItem value="no-student-selected" disabled>
                            Selecciona un estudiante primero
                          </SelectItem>
                        ) : courses.length === 0 ? (
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

              {enrollmentInfo.enrollment && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                  <p className="text-sm font-medium text-green-900">
                    {enrollmentInfo.enrollment.course.title} -{' '}
                    {enrollmentInfo.enrollment.academicPeriod.name}
                  </p>
                  <p className="text-xs text-green-700">
                    Progreso: {enrollmentInfo.enrollment.classesAttended}/
                    {enrollmentInfo.enrollment.classesTotal} clases
                  </p>
                </div>
              )}

              {enrollmentInfo.error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                  <p className="text-sm font-medium text-red-900">⚠️ {enrollmentInfo.error}</p>
                  <p className="text-xs text-red-700 mt-1">
                    Verifica que el estudiante esté inscrito en este curso.
                  </p>
                </div>
              )}

              <FormField
                control={form.control}
                name="enrollmentId"
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
                          <SelectValue
                            placeholder={
                              !form.watch('courseId')
                                ? 'Primero selecciona un curso'
                                : 'Selecciona un profesor'
                            }
                          />
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
                          courseTeachers.map((teacher) => (
                            <SelectItem key={teacher.id} value={teacher.id}>
                              {teacher.name} {teacher.lastName}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    {form.watch('courseId') && courseTeachers.length === 0 && (
                      <p className="text-sm text-amber-600">
                        No hay profesores asignados a este curso. Asigna profesores desde la gestión
                        de usuarios.
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="day"
                render={({ field }) => {
                  const teacherId = form.watch('teacherId')
                  const hasTeacher = !!teacherId

                  return (
                    <FormItem>
                      <FormLabel>Fecha</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={!hasTeacher}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={
                                !hasTeacher
                                  ? 'Selecciona un profesor primero'
                                  : 'Selecciona una fecha'
                              }
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {!hasTeacher ? (
                            <SelectItem value="no-teacher" disabled>
                              Selecciona un profesor primero
                            </SelectItem>
                          ) : teacherAvailableDays.length === 0 ? (
                            <SelectItem value="no-availability" disabled>
                              El profesor no tiene disponibilidad configurada
                            </SelectItem>
                          ) : (
                            teacherAvailableDays.map((date) => {
                              // Usar utilidad de fecha para formatear correctamente
                              const formattedDate = formatDateLong(date)
                              
                              return (
                                <SelectItem key={date} value={date}>
                                  {formattedDate}
                                </SelectItem>
                              )
                            })
                          )}
                        </SelectContent>
                      </Select>
                      {hasTeacher && teacherAvailableDays.length === 0 && (
                        <p className="text-xs text-amber-600">
                          El profesor no tiene disponibilidad configurada en el período académico
                        </p>
                      )}
                      {hasTeacher && teacherAvailableDays.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Mostrando solo fechas con disponibilidad del profesor
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )
                }}
              />

              <FormField
                control={form.control}
                name="timeSlot"
                render={({ field }) => {
                  const day = form.watch('day')
                  const hasDay = !!day

                  return (
                    <FormItem>
                      <FormLabel>Horario</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={!hasDay}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={
                                !hasDay ? 'Selecciona una fecha primero' : 'Selecciona un horario'
                              }
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {!hasDay ? (
                            <SelectItem value="no-date" disabled>
                              Selecciona una fecha primero
                            </SelectItem>
                          ) : teacherAvailableSlots.length === 0 ? (
                            <SelectItem value="no-availability" disabled>
                              El profesor no tiene horarios disponibles para este día
                            </SelectItem>
                          ) : (
                            teacherAvailableSlots.map((slot) => (
                              <SelectItem key={slot} value={slot}>
                                {slot}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      {hasDay && teacherAvailableSlots.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Mostrando solo horarios disponibles del profesor
                        </p>
                      )}
                      {hasDay && teacherAvailableSlots.length === 0 && (
                        <p className="text-xs text-amber-600">
                          El profesor no tiene bloques de horario configurados para este día
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )
                }}
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
