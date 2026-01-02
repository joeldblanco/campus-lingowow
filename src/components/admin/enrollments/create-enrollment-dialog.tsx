'use client'

import { useState, useEffect } from 'react'
import { createEnrollmentWithSchedule, getAllStudents, getPublishedCourses, getActiveAndFutureAcademicPeriods } from '@/lib/actions/enrollments'
import { verifyPaypalTransaction } from '@/lib/actions/commercial'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
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
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Loader2, ArrowRight, Video } from 'lucide-react'
import { ScheduleSelectorStep } from './schedule-selector-step'

const CreateEnrollmentSchema = z.object({
  studentId: z.string().min(1, 'Debes seleccionar un estudiante'),
  courseId: z.string().min(1, 'Debes seleccionar un curso'),
  academicPeriodId: z.string().min(1, 'Debes seleccionar un período académico'),
  paypalOrderId: z.string().min(1, 'El ID de pago de PayPal es obligatorio'),
})

interface CreateEnrollmentDialogProps {
  children: React.ReactNode
  onEnrollmentCreated?: () => void
}

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

type Step = 'basic' | 'schedule'

export function CreateEnrollmentDialog({ children, onEnrollmentCreated }: CreateEnrollmentDialogProps) {
  const [open, setOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState<Step>('basic')
  const [isLoading, setIsLoading] = useState(false)
  const [students, setStudents] = useState<
    Array<{ id: string; name: string; lastName: string | null; email: string; image: string | null }>
  >([])
  const [courses, setCourses] = useState<
    Array<{ id: string; title: string; description: string; level: string; classDuration: number; isSynchronous: boolean; _count: { modules: number; teacherCourses: number } }>
  >([])
  const [academicPeriods, setAcademicPeriods] = useState<
    Array<{ id: string; name: string; startDate: Date; endDate: Date; isActive: boolean }>
  >([])
  const [loadingData, setLoadingData] = useState(true)
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false)
  const [verifiedPaymentAmount, setVerifiedPaymentAmount] = useState<number | null>(null)

  const form = useForm<z.infer<typeof CreateEnrollmentSchema>>({
    resolver: zodResolver(CreateEnrollmentSchema),
    defaultValues: {
      studentId: '',
      courseId: '',
      academicPeriodId: '',
      paypalOrderId: '',
    },
  })

  // Watch for changes in paypalOrderId to reset verification if changed
  const paypalOrderId = form.watch('paypalOrderId')

  useEffect(() => {
    setVerifiedPaymentAmount(null)
  }, [paypalOrderId])

  // Obtener el curso seleccionado
  const selectedCourseId = form.watch('courseId')
  const selectedCourse = courses.find((c) => c.id === selectedCourseId)
  const isSynchronousCourse = selectedCourse?.isSynchronous ?? false

  // Obtener el período seleccionado
  const selectedPeriodId = form.watch('academicPeriodId')
  const selectedPeriod = academicPeriods.find((p) => p.id === selectedPeriodId)

  const verifyPayment = async () => {
    const orderId = form.getValues('paypalOrderId')
    if (!orderId || orderId.length < 5) {
      toast.error('Ingresa un ID de PayPal válido')
      return
    }

    setIsVerifyingPayment(true)
    try {
      const result = await verifyPaypalTransaction(orderId)
      if (result.success && result.data) {
        setVerifiedPaymentAmount(result.data.amount)
        
        // Auto-complete fields if plan/course was matched
        const messages: string[] = [`Pago verificado: ${result.data.amount} ${result.data.currency}`]
        
        if (result.data.matchedCourse) {
          // Find the course in our loaded courses
          const matchedCourseInList = courses.find(c => c.id === result.data.matchedCourse?.id)
          if (matchedCourseInList) {
            form.setValue('courseId', result.data.matchedCourse.id)
            messages.push(`Curso detectado: ${result.data.matchedCourse.title}`)
          }
        }
        
        if (result.data.matchedPlan) {
          messages.push(`Plan: ${result.data.matchedPlan.name}`)
        }

        // Try to find student by email
        if (result.data.email) {
          const matchedStudent = students.find(s => 
            s.email.toLowerCase() === result.data.email.toLowerCase()
          )
          if (matchedStudent) {
            form.setValue('studentId', matchedStudent.id)
            messages.push(`Estudiante detectado: ${matchedStudent.name} ${matchedStudent.lastName || ''}`)
          }
        }
        
        toast.success(messages.join(' • '))
      } else {
        setVerifiedPaymentAmount(null)
        toast.error(result.error || 'No se pudo verificar el pago')
      }
    } catch (error) {
      console.error(error)
      toast.error('Error al verificar el pago')
    } finally {
      setIsVerifyingPayment(false)
    }
  }

  useEffect(() => {
    if (open) {
      loadData()
    }
  }, [open])

  const loadData = async () => {
    setLoadingData(true)
    try {
      const [studentsData, coursesData, periodsData] = await Promise.all([
        getAllStudents(),
        getPublishedCourses(),
        getActiveAndFutureAcademicPeriods(),
      ])
      setStudents(studentsData)
      setCourses(coursesData)
      setAcademicPeriods(periodsData)
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Error al cargar los datos')
    } finally {
      setLoadingData(false)
    }
  }

  // Manejar el paso siguiente para cursos sincrónicos
  const handleNextStep = () => {
    if (!form.getValues('studentId') || !form.getValues('courseId') || !form.getValues('academicPeriodId') || !form.getValues('paypalOrderId')) {
      toast.error('Por favor completa todos los campos')
      return
    }
    if (verifiedPaymentAmount === null) {
      toast.error('Por favor verifica el pago de PayPal')
      return
    }
    setCurrentStep('schedule')
  }

  // Crear inscripción sin horario (cursos asincrónicos)
  const onSubmitAsync = async (values: z.infer<typeof CreateEnrollmentSchema>) => {
    setIsLoading(true)
    try {
      const result = await createEnrollmentWithSchedule({
        ...values,
        teacherId: undefined,
        scheduledClasses: [],
        isRecurring: false,
        weeklySchedule: [],
      })

      if (result.success) {
        toast.success('Inscripción creada exitosamente')
        handleClose()
        onEnrollmentCreated?.()
      } else {
        toast.error(result.error || 'Error al crear la inscripción')
      }
    } catch (error) {
      console.error(error)
      toast.error('Error al crear la inscripción')
    } finally {
      setIsLoading(false)
    }
  }

  // Crear inscripción con horario (cursos sincrónicos)
  const handleScheduleConfirmed = async (
    teacherId: string,
    scheduledClasses: ScheduledClass[],
    isRecurring: boolean,
    weeklySchedule: ScheduleSlot[]
  ) => {
    setIsLoading(true)
    try {
      const values = form.getValues()
      const result = await createEnrollmentWithSchedule({
        ...values,
        teacherId,
        scheduledClasses,
        isRecurring,
        weeklySchedule,
      })

      if (result.success) {
        toast.success(`Inscripción creada exitosamente con ${scheduledClasses.length} clases programadas`)
        handleClose()
        onEnrollmentCreated?.()
      } else {
        toast.error(result.error || 'Error al crear la inscripción')
      }
    } catch (error) {
      console.error(error)
      toast.error('Error al crear la inscripción')
    } finally {
      setIsLoading(false)
    }
  }

  // Cerrar y resetear el modal
  const handleClose = () => {
    setOpen(false)
    setCurrentStep('basic')
    form.reset()
    setVerifiedPaymentAmount(null)
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
            {currentStep === 'basic' ? 'Nueva Inscripción' : 'Seleccionar Horario de Clases'}
          </DialogTitle>
          <DialogDescription>
            {currentStep === 'basic' 
              ? 'Inscribe a un estudiante. Se requiere un pago de PayPal válido.'
              : `Configura el horario de clases para ${selectedCourse?.title}`
            }
          </DialogDescription>
        </DialogHeader>

        {loadingData ? (
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
            <form onSubmit={isSynchronousCourse ? (e) => { e.preventDefault(); handleNextStep(); } : form.handleSubmit(onSubmitAsync)} className="space-y-4">
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
                            No hay estudiantes disponibles
                          </SelectItem>
                        ) : (
                          students.map((student) => (
                            <SelectItem key={student.id} value={student.id}>
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarImage src={student.image || ''} />
                                  <AvatarFallback className="text-xs">
                                    {student.name[0]}
                                    {student.lastName?.[0] || ''}
                                  </AvatarFallback>
                                </Avatar>
                                <span>
                                  {student.name} {student.lastName || ''} - {student.email}
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
                                    {course.isSynchronous && ` • ${course.classDuration || 40} min/clase`}
                                  </div>
                                </div>
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

              <FormField
                control={form.control}
                name="academicPeriodId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Período Académico</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un período académico" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {academicPeriods.length === 0 ? (
                          <SelectItem value="no-periods" disabled>
                            No hay períodos académicos activos
                          </SelectItem>
                        ) : (
                          academicPeriods.map((period) => {
                            const isFuture = new Date(period.startDate) > new Date()
                            return (
                              <SelectItem key={period.id} value={period.id}>
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
                name="paypalOrderId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ID de Pago / Factura PayPal</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input
                          placeholder="Ej: 5W840924G1436423K"
                          {...field}
                          onChange={(e) => {
                            // Basic URL extraction logic
                            let val = e.target.value
                            if (val.includes('http')) {
                              const invoiceMatch = val.match(/invoice\/p\/#([A-Za-z0-9]+)|invoice\/s\/([A-Za-z0-9]+)/)
                              if (invoiceMatch) {
                                val = invoiceMatch[1] || invoiceMatch[2]
                              } else {
                                const tokenMatch = val.match(/token=([A-Za-z0-9]+)/)
                                if (tokenMatch) {
                                  val = tokenMatch[1]
                                } else {
                                  const parts = val.split('/')
                                  const last = parts[parts.length - 1].replace('#', '')
                                  if (last && last.length > 5) {
                                    val = last
                                  }
                                }
                              }
                            }
                            field.onChange(val)
                          }}
                        />
                      </FormControl>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={verifyPayment}
                        disabled={isVerifyingPayment || !field.value || verifiedPaymentAmount !== null}
                      >
                        {isVerifyingPayment ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : verifiedPaymentAmount !== null ? (
                          'Verificado'
                        ) : (
                          'Verificar'
                        )}
                      </Button>
                    </div>
                    {verifiedPaymentAmount !== null && (
                      <p className="text-xs text-green-600 font-medium">
                        Pago confirmado por monto de {verifiedPaymentAmount}
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
                  Cancelar
                </Button>
                {isSynchronousCourse ? (
                  <Button type="submit" disabled={verifiedPaymentAmount === null}>
                    Siguiente: Seleccionar Horario
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button type="submit" disabled={isLoading || verifiedPaymentAmount === null}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creando...
                      </>
                    ) : (
                      'Crear Inscripción'
                    )}
                  </Button>
                )}
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  )
}
