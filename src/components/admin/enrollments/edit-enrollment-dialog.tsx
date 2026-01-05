'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  updateEnrollment,
  updateEnrollmentWithSchedule,
  getPublishedCourses,
  getAllAcademicPeriods,
} from '@/lib/actions/enrollments'
import { EnrollmentWithDetails } from '@/lib/actions/enrollments'
import { Button } from '@/components/ui/button'
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
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { Loader2, Video, Calendar, CalendarClock } from 'lucide-react'
import { ScheduleSelectorStep } from './schedule-selector-step'
import { useTimezone } from '@/hooks/use-timezone'

const EditEnrollmentSchema = z.object({
  status: z.enum(['PENDING', 'ACTIVE', 'COMPLETED', 'PAUSED', 'CANCELLED']),
  progress: z.number().min(0).max(100),
  courseId: z.string().min(1, 'Selecciona un programa'),
  academicPeriodId: z.string().min(1, 'Selecciona un período'),
})

interface ScheduleSlot {
  teacherId: string
  dayOfWeek: number
  startTime: string
  endTime: string
}

interface ScheduledClass {
  date: string
  dayOfWeek: number
  startTime: string
  endTime: string
  teacherId: string
}

interface Course {
  id: string
  title: string
  level: string
  classDuration: number
  isSynchronous: boolean
  _count: { modules: number; teacherCourses: number }
}

interface AcademicPeriod {
  id: string
  name: string
  startDate: Date
  endDate: Date
  isActive: boolean
}

type Step = 'basic' | 'schedule'

interface EditEnrollmentDialogProps {
  children: React.ReactNode
  enrollment: EnrollmentWithDetails
  onEnrollmentUpdated?: () => void
}

export function EditEnrollmentDialog({
  children,
  enrollment,
  onEnrollmentUpdated,
}: EditEnrollmentDialogProps) {
  const { timezone: userTimezone } = useTimezone()
  const [open, setOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState<Step>('basic')
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(false)
  
  const [courses, setCourses] = useState<Course[]>([])
  const [periods, setPeriods] = useState<AcademicPeriod[]>([])

  const form = useForm<z.infer<typeof EditEnrollmentSchema>>({
    resolver: zodResolver(EditEnrollmentSchema),
    defaultValues: {
      status: enrollment.status,
      progress: enrollment.progress,
      courseId: enrollment.courseId,
      academicPeriodId: enrollment.academicPeriodId,
    },
  })

  // Obtener el curso seleccionado
  const selectedCourseId = form.watch('courseId')
  const selectedCourse = courses.find((c) => c.id === selectedCourseId)
  const isSynchronousCourse = selectedCourse?.isSynchronous ?? false

  // Obtener el período seleccionado
  const selectedPeriodId = form.watch('academicPeriodId')
  const selectedPeriod = periods.find((p) => p.id === selectedPeriodId)

  const loadInitialData = useCallback(async () => {
    setIsLoadingData(true)
    try {
      const [coursesData, periodsData] = await Promise.all([
        getPublishedCourses(),
        getAllAcademicPeriods(),
      ])

      setCourses(coursesData)
      setPeriods(periodsData)
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Error al cargar los datos')
    } finally {
      setIsLoadingData(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      loadInitialData()
      // Reset form when opening
      form.reset({
        status: enrollment.status,
        progress: enrollment.progress,
        courseId: enrollment.courseId,
        academicPeriodId: enrollment.academicPeriodId,
      })
      setCurrentStep('basic')
    }
  }, [open, loadInitialData, enrollment, form])

  // Manejar el paso siguiente para modificar horario
  const handleModifySchedule = () => {
    const values = form.getValues()
    if (!values.courseId || !values.academicPeriodId) {
      toast.error('Por favor completa todos los campos')
      return
    }
    setCurrentStep('schedule')
  }

  // Actualizar inscripción sin cambiar horario
  const onSubmit = async (values: z.infer<typeof EditEnrollmentSchema>) => {
    setIsLoading(true)
    try {
      const result = await updateEnrollment(enrollment.id, {
        status: values.status,
        progress: values.progress,
        courseId: values.courseId,
        academicPeriodId: values.academicPeriodId,
      })

      if (result.success) {
        toast.success('Inscripción actualizada exitosamente')
        handleClose()
        onEnrollmentUpdated?.()
      } else {
        toast.error(result.error || 'Error al actualizar la inscripción')
      }
    } catch (error) {
      console.error(error)
      toast.error('Error al actualizar la inscripción')
    } finally {
      setIsLoading(false)
    }
  }

  // Actualizar inscripción con horario (cursos sincrónicos)
  const handleScheduleConfirmed = async (
    teacherId: string,
    scheduledClasses: ScheduledClass[],
    isRecurring: boolean,
    weeklySchedule: ScheduleSlot[]
  ) => {
    setIsLoading(true)
    try {
      const values = form.getValues()
      const result = await updateEnrollmentWithSchedule(enrollment.id, {
        status: values.status,
        progress: values.progress,
        courseId: values.courseId,
        academicPeriodId: values.academicPeriodId,
        teacherId,
        scheduledClasses,
        isRecurring,
        weeklySchedule,
        userTimezone,
      })

      if (result.success) {
        toast.success(result.message || 'Inscripción actualizada exitosamente')
        handleClose()
        onEnrollmentUpdated?.()
      } else {
        toast.error(result.error || 'Error al actualizar la inscripción')
      }
    } catch (error) {
      console.error(error)
      toast.error('Error al actualizar la inscripción')
    } finally {
      setIsLoading(false)
    }
  }

  // Cerrar y resetear el modal
  const handleClose = () => {
    setOpen(false)
    setCurrentStep('basic')
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) handleClose()
      else setOpen(true)
    }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className={currentStep === 'schedule' ? 'sm:max-w-[1000px] max-h-[90vh] overflow-y-auto' : 'sm:max-w-[500px]'}>
        <DialogHeader>
          <DialogTitle>
            {currentStep === 'basic' ? 'Editar Inscripción' : 'Modificar Horario de Clases'}
          </DialogTitle>
          <DialogDescription>
            {currentStep === 'basic' 
              ? `Modifica la inscripción de ${enrollment.student.name} ${enrollment.student.lastName || ''}`
              : `Configura el nuevo horario de clases para ${selectedCourse?.title}. Las clases futuras actuales serán canceladas.`
            }
          </DialogDescription>
        </DialogHeader>

        {isLoadingData ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : currentStep === 'schedule' && selectedCourse && selectedPeriod ? (
          <ScheduleSelectorStep
            courseId={selectedCourse.id}
            courseName={selectedCourse.title}
            classDuration={selectedCourse.classDuration || 40}
            academicPeriodId={selectedPeriod.id}
            periodStartDate={new Date(selectedPeriod.startDate)}
            periodEndDate={new Date(selectedPeriod.endDate)}
            onScheduleConfirmed={handleScheduleConfirmed}
            onBack={() => setCurrentStep('basic')}
          />
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Programa */}
              <FormField
                control={form.control}
                name="courseId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Programa</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un programa" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {courses.map((course) => (
                          <SelectItem key={course.id} value={course.id}>
                            <div className="flex items-center gap-2">
                              <div className="flex-1">
                                <div className="font-medium flex items-center gap-2">
                                  {course.title}
                                  {course.isSynchronous && (
                                    <Badge variant="secondary" className="text-xs">
                                      <Video className="h-3 w-3 mr-1" />
                                      Sincrónico
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Nivel {course.level} • {course._count.modules} módulos
                                </div>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Período Académico */}
              <FormField
                control={form.control}
                name="academicPeriodId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Período Académico</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un período" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {periods.map((period) => {
                          const isFuture = new Date(period.startDate) > new Date()
                          return (
                            <SelectItem key={period.id} value={period.id}>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <div className="font-medium flex items-center gap-2">
                                    {period.name}
                                    {isFuture && (
                                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                        Futuro
                                      </span>
                                    )}
                                    {period.isActive && !isFuture && (
                                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                                        Activo
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {new Date(period.startDate).toLocaleDateString('es-ES')} -{' '}
                                    {new Date(period.endDate).toLocaleDateString('es-ES')}
                                  </div>
                                </div>
                              </div>
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                {/* Estado */}
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona un estado" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="PENDING">Pre-inscripción</SelectItem>
                          <SelectItem value="ACTIVE">Activo</SelectItem>
                          <SelectItem value="COMPLETED">Completado</SelectItem>
                          <SelectItem value="PAUSED">Pausado</SelectItem>
                          <SelectItem value="CANCELLED">Cancelado</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Progreso */}
                <FormField
                  control={form.control}
                  name="progress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Progreso (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          placeholder="0"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Botón para modificar horario (solo cursos sincrónicos) */}
              {isSynchronousCourse && (
                <div className="p-3 bg-muted/50 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CalendarClock className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Horario de clases</p>
                        <p className="text-xs text-muted-foreground">
                          Modifica el profesor y/o los horarios de clase
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleModifySchedule}
                    >
                      Modificar Horario
                    </Button>
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    'Guardar Cambios'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  )
}
