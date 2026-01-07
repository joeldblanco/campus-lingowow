'use server'

import { db } from '@/lib/db'
import { EnrollmentStatus } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { getCurrentDate, isAfterDate, getTodayStart, getStartOfDayUTC, getEndOfDayUTC } from '@/lib/utils/date'
import { verifyPaypalTransaction, createInvoiceFromPaypal } from '@/lib/actions/commercial'
import { notifyNewEnrollment } from '@/lib/actions/notifications'
import { sendNewEnrollmentTeacherEmail } from '@/lib/mail'

export interface EnrollmentWithDetails {
  id: string
  studentId: string
  courseId: string
  academicPeriodId: string
  status: EnrollmentStatus
  progress: number
  enrollmentDate: Date
  lastAccessed: Date | null
  student: {
    id: string
    name: string
    lastName: string | null
    email: string
    image: string | null
  }
  course: {
    id: string
    title: string
    description: string
    level: string
    isPublished: boolean
    _count: {
      modules: number
    }
  }
  academicPeriod: {
    id: string
    name: string
    startDate: Date
    endDate: Date
    isActive: boolean
  }
}

export interface EnrollmentStats {
  totalEnrollments: number
  pendingEnrollments: number
  activeEnrollments: number
  completedEnrollments: number
  pausedEnrollments: number
  averageProgress: number
}

// Get all enrollments with details
export async function getAllEnrollments(): Promise<EnrollmentWithDetails[]> {
  try {
    const enrollments = await db.enrollment.findMany({
      include: {
        student: {
          select: {
            id: true,
            name: true,
            lastName: true,
            email: true,
            image: true,
          },
        },
        course: {
          select: {
            id: true,
            title: true,
            description: true,
            level: true,
            isPublished: true,
            _count: {
              select: {
                modules: true,
              },
            },
          },
        },
        academicPeriod: {
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
            isActive: true,
          },
        },
      },
      orderBy: {
        enrollmentDate: 'desc',
      },
    })

    return enrollments
  } catch (error) {
    console.error('Error fetching enrollments:', error)
    throw new Error('Failed to fetch enrollments')
  }
}

// Get enrollment by ID
export async function getEnrollmentById(id: string): Promise<EnrollmentWithDetails | null> {
  try {
    const enrollment = await db.enrollment.findUnique({
      where: { id },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            lastName: true,
            email: true,
            image: true,
          },
        },
        course: {
          select: {
            id: true,
            title: true,
            description: true,
            level: true,
            isPublished: true,
            _count: {
              select: {
                modules: true,
              },
            },
          },
        },
        academicPeriod: {
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
            isActive: true,
          },
        },
      },
    })

    return enrollment
  } catch (error) {
    console.error('Error fetching enrollment:', error)
    throw new Error('Failed to fetch enrollment')
  }
}

// Get enrollment statistics
export async function getEnrollmentStats(): Promise<EnrollmentStats> {
  try {
    const [
      totalEnrollments,
      pendingEnrollments,
      activeEnrollments,
      completedEnrollments,
      pausedEnrollments,
      enrollmentsWithProgress,
    ] = await Promise.all([
      db.enrollment.count(),
      db.enrollment.count({ where: { status: EnrollmentStatus.PENDING } }),
      db.enrollment.count({ where: { status: EnrollmentStatus.ACTIVE } }),
      db.enrollment.count({ where: { status: EnrollmentStatus.COMPLETED } }),
      db.enrollment.count({ where: { status: EnrollmentStatus.PAUSED } }),
      db.enrollment.findMany({
        select: {
          progress: true,
        },
      }),
    ])

    const averageProgress =
      enrollmentsWithProgress.length > 0
        ? enrollmentsWithProgress.reduce((sum, e) => sum + e.progress, 0) /
          enrollmentsWithProgress.length
        : 0

    return {
      totalEnrollments,
      pendingEnrollments,
      activeEnrollments,
      completedEnrollments,
      pausedEnrollments,
      averageProgress: Math.round(averageProgress),
    }
  } catch (error) {
    console.error('Error fetching enrollment stats:', error)
    throw new Error('Failed to fetch enrollment stats')
  }
}

// Create new enrollment
export async function createEnrollment(data: {
  studentId: string
  courseId: string
  academicPeriodId: string
  paypalOrderId: string
}) {
  try {
    // 1. Verify PayPal Transaction FIRST
    console.log('[Enrollment] Verifying PayPal Order:', data.paypalOrderId)
    const paypalCheck = await verifyPaypalTransaction(data.paypalOrderId)

    if (!paypalCheck.success || !paypalCheck.data) {
      return {
        success: false,
        error: paypalCheck.error || 'Error al verificar el pago de PayPal.',
      }
    }

    // Check if invoice already exists (Double check, though verifyPaypalTransaction does it)
    const existingInvoice = await db.invoice.findFirst({
      where: { paypalOrderId: data.paypalOrderId },
    })

    if (existingInvoice) {
      return {
        success: false,
        error: 'Este pago de PayPal ya está asociado a otra factura/inscripción.',
      }
    }

    // 2. Check if enrollment already exists
    const existingEnrollment = await db.enrollment.findUnique({
      where: {
        studentId_courseId_academicPeriodId: {
          studentId: data.studentId,
          courseId: data.courseId,
          academicPeriodId: data.academicPeriodId,
        },
      },
    })

    if (existingEnrollment) {
      return {
        success: false,
        error: 'El estudiante ya está inscrito en este curso para este período académico',
      }
    }

    // Verify student exists
    const student = await db.user.findUnique({
      where: { id: data.studentId },
    })

    if (!student) {
      return { success: false, error: 'Estudiante no encontrado' }
    }

    // Verify course exists
    const course = await db.course.findUnique({
      where: { id: data.courseId },
    })

    if (!course) {
      return { success: false, error: 'Curso no encontrado' }
    }

    // Verify academic period exists
    const academicPeriod = await db.academicPeriod.findUnique({
      where: { id: data.academicPeriodId },
    })

    if (!academicPeriod) {
      return { success: false, error: 'Período académico no encontrado' }
    }

    // Determinar el estado según la fecha de inicio del período
    const today = getCurrentDate()
    const status = isAfterDate(academicPeriod.startDate, today)
      ? EnrollmentStatus.PENDING
      : EnrollmentStatus.ACTIVE

    // 3. Create Enrollment and Invoice "Atomically" (Sequential with rollback)
    // We create Enrollment first.
    let enrollment
    try {
      enrollment = await db.enrollment.create({
        data: {
          studentId: data.studentId,
          courseId: data.courseId,
          academicPeriodId: data.academicPeriodId,
          status: status,
          progress: 0,
        },
      })
    } catch (err) {
      console.error('Error creating enrollment record:', err)
      return { success: false, error: 'Error al crear el registro de inscripción' }
    }

    // 4. Create Invoice linked to this user
    const invoiceResult = await createInvoiceFromPaypal(paypalCheck.data, data.studentId)

    if (!invoiceResult.success) {
      // ROLLBACK Enrollment
      console.error('Invoice creation failed. Rolling back enrollment...')
      await db.enrollment.delete({ where: { id: enrollment.id } })
      return {
        success: false,
        error: 'Error al generar la factura. La inscripción ha sido revertida.',
      }
    }

    revalidatePath('/admin/enrollments')
    revalidatePath('/admin/invoices')
    return { success: true, enrollment }
  } catch (error) {
    console.error('Error creating enrollment:', error)
    return { success: false, error: 'Error inesperado al procesar la inscripción' }
  }
}

// Interfaces para crear inscripción con horario
interface ScheduleSlot {
  teacherId: string
  dayOfWeek: number
  startTime: string
  endTime: string
}

interface ScheduledClass {
  date: string // YYYY-MM-DD
  dayOfWeek: number
  startTime: string
  endTime: string
  teacherId: string
}

interface CreateEnrollmentWithScheduleData {
  studentId: string
  courseId: string
  academicPeriodId: string
  paypalOrderId: string
  teacherId?: string
  scheduledClasses: ScheduledClass[]
  isRecurring: boolean
  weeklySchedule: ScheduleSlot[]
  userTimezone?: string // Timezone del usuario que crea la inscripción
}

// Create enrollment with schedule (for synchronous courses)
export async function createEnrollmentWithSchedule(data: CreateEnrollmentWithScheduleData) {
  try {
    // 1. Verify PayPal Transaction FIRST
    console.log('[Enrollment] Verifying PayPal Order:', data.paypalOrderId)
    const paypalCheck = await verifyPaypalTransaction(data.paypalOrderId)

    if (!paypalCheck.success || !paypalCheck.data) {
      return {
        success: false,
        error: paypalCheck.error || 'Error al verificar el pago de PayPal.',
      }
    }

    // Check if invoice already exists
    const existingInvoice = await db.invoice.findFirst({
      where: { paypalOrderId: data.paypalOrderId },
    })

    if (existingInvoice) {
      return {
        success: false,
        error: 'Este pago de PayPal ya está asociado a otra factura/inscripción.',
      }
    }

    // 2. Check if enrollment already exists
    const existingEnrollment = await db.enrollment.findUnique({
      where: {
        studentId_courseId_academicPeriodId: {
          studentId: data.studentId,
          courseId: data.courseId,
          academicPeriodId: data.academicPeriodId,
        },
      },
    })

    if (existingEnrollment) {
      return {
        success: false,
        error: 'El estudiante ya está inscrito en este curso para este período académico',
      }
    }

    // Verify student exists
    const student = await db.user.findUnique({
      where: { id: data.studentId },
    })

    if (!student) {
      return { success: false, error: 'Estudiante no encontrado' }
    }

    // Verify course exists
    const course = await db.course.findUnique({
      where: { id: data.courseId },
    })

    if (!course) {
      return { success: false, error: 'Curso no encontrado' }
    }

    // Verify academic period exists
    const academicPeriod = await db.academicPeriod.findUnique({
      where: { id: data.academicPeriodId },
    })

    if (!academicPeriod) {
      return { success: false, error: 'Período académico no encontrado' }
    }

    // Determinar el estado según la fecha de inicio del período
    const today = getCurrentDate()
    const status = isAfterDate(academicPeriod.startDate, today)
      ? EnrollmentStatus.PENDING
      : EnrollmentStatus.ACTIVE

    // 3. Create Enrollment, Invoice, and Schedule in a transaction
    let enrollment
    try {
      enrollment = await db.enrollment.create({
        data: {
          studentId: data.studentId,
          courseId: data.courseId,
          academicPeriodId: data.academicPeriodId,
          status: status,
          progress: 0,
          classesTotal: data.scheduledClasses.length || 8,
          classesAttended: 0,
          classesMissed: 0,
        },
      })
    } catch (err) {
      console.error('Error creating enrollment record:', err)
      return { success: false, error: 'Error al crear el registro de inscripción' }
    }

    // 4. Create Invoice linked to this user
    const invoiceResult = await createInvoiceFromPaypal(paypalCheck.data, data.studentId)

    if (!invoiceResult.success) {
      // ROLLBACK Enrollment
      console.error('Invoice creation failed. Rolling back enrollment...')
      await db.enrollment.delete({ where: { id: enrollment.id } })
      return {
        success: false,
        error: 'Error al generar la factura. La inscripción ha sido revertida.',
      }
    }

    // 5. Create class schedules and bookings if this is a synchronous course
    if (data.teacherId && data.scheduledClasses.length > 0) {
      try {
        // Create recurring schedule entries if applicable
        if (data.isRecurring && data.weeklySchedule.length > 0) {
          // Usar timezone del usuario pasada desde el cliente
          const { convertRecurringScheduleToUTC } = await import('@/lib/utils/date')
          const scheduleTimezone = data.userTimezone || 'America/Lima'
          
          for (const slot of data.weeklySchedule) {
            // Convertir horario recurrente a UTC usando timezone del usuario
            const utcSchedule = convertRecurringScheduleToUTC(
              slot.dayOfWeek,
              slot.startTime,
              slot.endTime,
              scheduleTimezone
            )
            
            await db.classSchedule.create({
              data: {
                enrollmentId: enrollment.id,
                teacherId: slot.teacherId,
                dayOfWeek: utcSchedule.dayOfWeek,
                startTime: utcSchedule.startTime,
                endTime: utcSchedule.endTime,
              },
            })
          }
        }

        // Create individual class bookings
        // Importar función de conversión a UTC
        const { convertTimeSlotToUTC } = await import('@/lib/utils/date')
        
        // Usar timezone del usuario pasada desde el cliente
        // Las clases se muestran en hora local del usuario, así que debemos convertir a UTC
        const userTimezone = data.userTimezone || 'America/Lima'
        
        for (const cls of data.scheduledClasses) {
          const localTimeSlot = `${cls.startTime}-${cls.endTime}`
          
          // Convertir fecha y horario de hora local a UTC
          const utcData = convertTimeSlotToUTC(cls.date, localTimeSlot, userTimezone)
          
          // Check if the slot is already booked
          const existingBooking = await db.classBooking.findUnique({
            where: {
              teacherId_day_timeSlot: {
                teacherId: cls.teacherId,
                day: utcData.day,
                timeSlot: utcData.timeSlot,
              },
            },
          })

          if (!existingBooking) {
            await db.classBooking.create({
              data: {
                studentId: data.studentId,
                teacherId: cls.teacherId,
                enrollmentId: enrollment.id,
                day: utcData.day,
                timeSlot: utcData.timeSlot,
                status: 'CONFIRMED',
              },
            })
          } else {
            console.warn(`Slot already booked: ${utcData.day} ${utcData.timeSlot} for teacher ${cls.teacherId}`)
          }
        }

        console.log(`[Enrollment] Created ${data.scheduledClasses.length} class bookings`)
      } catch (scheduleError) {
        console.error('Error creating class schedules:', scheduleError)
        // Don't rollback the enrollment, just log the error
        // The admin can manually add classes later
      }
    }

    // 6. Send notifications to teacher and admins
    try {
      const studentFullName = `${student.name}${student.lastName ? ' ' + student.lastName : ''}`
      
      // If there's a teacher assigned, notify them
      if (data.teacherId) {
        const teacher = await db.user.findUnique({
          where: { id: data.teacherId },
          select: { id: true, name: true, email: true, timezone: true },
        })
        
        if (teacher) {
          // Platform notification
          await notifyNewEnrollment({
            studentId: data.studentId,
            studentName: studentFullName,
            teacherId: teacher.id,
            courseName: course.title,
            enrollmentId: enrollment.id,
          })
          
          // Email notification to teacher (use teacher's timezone)
          const teacherTimezone = teacher.timezone || 'America/Lima'
          await sendNewEnrollmentTeacherEmail(teacher.email, {
            teacherName: teacher.name,
            studentName: studentFullName,
            courseName: course.title,
            enrollmentDate: new Date().toLocaleDateString('es-PE', { 
              timeZone: teacherTimezone,
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            }),
          })
        }
      } else {
        // If no specific teacher, just notify admins
        await notifyNewEnrollment({
          studentId: data.studentId,
          studentName: studentFullName,
          teacherId: '', // Empty, will only notify admins
          courseName: course.title,
          enrollmentId: enrollment.id,
        })
      }
    } catch (notifError) {
      console.error('Error sending enrollment notifications:', notifError)
      // Don't fail the enrollment if notifications fail
    }

    revalidatePath('/admin/enrollments')
    revalidatePath('/admin/invoices')
    revalidatePath('/admin/classes')
    
    return { 
      success: true, 
      enrollment,
      classesCreated: data.scheduledClasses.length,
    }
  } catch (error) {
    console.error('Error creating enrollment with schedule:', error)
    return { success: false, error: 'Error inesperado al procesar la inscripción' }
  }
}

// Update enrollment
export async function updateEnrollment(
  id: string,
  data: {
    status?: EnrollmentStatus
    progress?: number
    courseId?: string
    academicPeriodId?: string
  }
) {
  try {
    // Si se cambia el curso o período, verificar que no exista duplicado
    if (data.courseId || data.academicPeriodId) {
      const currentEnrollment = await db.enrollment.findUnique({
        where: { id },
      })

      if (!currentEnrollment) {
        return { success: false, error: 'Inscripción no encontrada' }
      }

      const newCourseId = data.courseId || currentEnrollment.courseId
      const newPeriodId = data.academicPeriodId || currentEnrollment.academicPeriodId

      // Verificar si ya existe otra inscripción con la misma combinación
      const existingEnrollment = await db.enrollment.findFirst({
        where: {
          studentId: currentEnrollment.studentId,
          courseId: newCourseId,
          academicPeriodId: newPeriodId,
          id: { not: id },
        },
      })

      if (existingEnrollment) {
        return {
          success: false,
          error: 'El estudiante ya tiene una inscripción en este curso para este período',
        }
      }
    }

    const enrollment = await db.enrollment.update({
      where: { id },
      data: {
        ...data,
        lastAccessed: getCurrentDate(),
      },
    })

    revalidatePath('/admin/enrollments')
    return { success: true, enrollment }
  } catch (error) {
    console.error('Error updating enrollment:', error)
    return { success: false, error: 'Error al actualizar la inscripción' }
  }
}

// Get enrollment schedules (ClassSchedule) for an enrollment
export async function getEnrollmentSchedules(enrollmentId: string) {
  try {
    const schedules = await db.classSchedule.findMany({
      where: { enrollmentId },
      include: {
        teacher: {
          select: {
            id: true,
            name: true,
            lastName: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    })

    return { success: true, schedules }
  } catch (error) {
    console.error('Error fetching enrollment schedules:', error)
    return { success: false, error: 'Error al obtener los horarios', schedules: [] }
  }
}

// Update enrollment schedules
export async function updateEnrollmentSchedules(
  enrollmentId: string,
  schedules: Array<{
    id?: string
    teacherId: string
    dayOfWeek: number
    startTime: string
    endTime: string
  }>
) {
  try {
    // Verificar que la inscripción existe
    const enrollment = await db.enrollment.findUnique({
      where: { id: enrollmentId },
    })

    if (!enrollment) {
      return { success: false, error: 'Inscripción no encontrada' }
    }

    // Eliminar horarios existentes
    await db.classSchedule.deleteMany({
      where: { enrollmentId },
    })

    // Crear nuevos horarios con conversión a UTC
    if (schedules.length > 0) {
      const { convertRecurringScheduleToUTC } = await import('@/lib/utils/date')
      
      // Obtener timezones de los profesores
      const teacherIds = [...new Set(schedules.map(s => s.teacherId))]
      const teachers = await db.user.findMany({
        where: { id: { in: teacherIds } },
        select: { id: true, timezone: true },
      })
      const teacherTimezones = new Map(teachers.map(t => [t.id, t.timezone || 'America/Lima']))
      
      const utcSchedules = schedules.map((schedule) => {
        const timezone = teacherTimezones.get(schedule.teacherId) || 'America/Lima'
        const utcData = convertRecurringScheduleToUTC(
          schedule.dayOfWeek,
          schedule.startTime,
          schedule.endTime,
          timezone
        )
        return {
          enrollmentId,
          teacherId: schedule.teacherId,
          dayOfWeek: utcData.dayOfWeek,
          startTime: utcData.startTime,
          endTime: utcData.endTime,
        }
      })
      
      await db.classSchedule.createMany({
        data: utcSchedules,
      })
    }

    revalidatePath('/admin/enrollments')
    revalidatePath('/admin/classes')

    return { success: true, message: 'Horarios actualizados exitosamente' }
  } catch (error) {
    console.error('Error updating enrollment schedules:', error)
    return { success: false, error: 'Error al actualizar los horarios' }
  }
}

// Interfaces for schedule update with classes
interface ScheduledClass {
  date: string // YYYY-MM-DD
  dayOfWeek: number
  startTime: string
  endTime: string
  teacherId: string
}

interface WeeklyScheduleSlot {
  teacherId: string
  dayOfWeek: number
  startTime: string
  endTime: string
}

// Update enrollment with new schedule and classes
export async function updateEnrollmentWithSchedule(
  enrollmentId: string,
  data: {
    status?: EnrollmentStatus
    progress?: number
    courseId?: string
    academicPeriodId?: string
    teacherId: string
    scheduledClasses: ScheduledClass[]
    isRecurring: boolean
    weeklySchedule: WeeklyScheduleSlot[]
    userTimezone?: string // Timezone del usuario que edita la inscripción
  }
) {
  try {
    // Verificar que la inscripción existe
    const enrollment = await db.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        student: { select: { id: true } },
      },
    })

    if (!enrollment) {
      return { success: false, error: 'Inscripción no encontrada' }
    }

    // Si se cambia el curso o período, verificar que no exista duplicado
    if (data.courseId || data.academicPeriodId) {
      const newCourseId = data.courseId || enrollment.courseId
      const newPeriodId = data.academicPeriodId || enrollment.academicPeriodId

      const existingEnrollment = await db.enrollment.findFirst({
        where: {
          studentId: enrollment.studentId,
          courseId: newCourseId,
          academicPeriodId: newPeriodId,
          id: { not: enrollmentId },
        },
      })

      if (existingEnrollment) {
        return {
          success: false,
          error: 'El estudiante ya tiene una inscripción en este curso para este período',
        }
      }
    }

    // 1. Actualizar la inscripción
    await db.enrollment.update({
      where: { id: enrollmentId },
      data: {
        status: data.status,
        progress: data.progress,
        courseId: data.courseId,
        academicPeriodId: data.academicPeriodId,
        classesTotal: data.scheduledClasses.length || 8,
        lastAccessed: getCurrentDate(),
      },
    })

    // 2. Cancelar todas las clases futuras existentes (CONFIRMED o PENDING)
    const today = getTodayStart()
    const cancelledBookings = await db.classBooking.updateMany({
      where: {
        enrollmentId,
        day: { gte: today.toISOString().split('T')[0] },
        status: { in: ['CONFIRMED', 'PENDING'] },
      },
      data: {
        status: 'CANCELLED',
        cancelledAt: getCurrentDate(),
        cancelledBy: 'ADMIN_RESCHEDULE',
      },
    })

    console.log(`[Enrollment Update] Cancelled ${cancelledBookings.count} future bookings`)

    // 3. Eliminar horarios recurrentes existentes
    await db.classSchedule.deleteMany({
      where: { enrollmentId },
    })

    // 4. Crear nuevos horarios recurrentes si aplica
    // Importar funciones de conversión a UTC
    const { convertRecurringScheduleToUTC, convertTimeSlotToUTC } = await import('@/lib/utils/date')
    
    // Usar timezone del usuario pasada desde el cliente
    const userTimezone = data.userTimezone || 'America/Lima'
    
    if (data.isRecurring && data.weeklySchedule.length > 0) {
      const utcSchedules = data.weeklySchedule.map((slot) => {
        // Convertir horario recurrente de hora local a UTC
        const utcSchedule = convertRecurringScheduleToUTC(
          slot.dayOfWeek,
          slot.startTime,
          slot.endTime,
          userTimezone
        )
        return {
          enrollmentId,
          teacherId: slot.teacherId,
          dayOfWeek: utcSchedule.dayOfWeek,
          startTime: utcSchedule.startTime,
          endTime: utcSchedule.endTime,
        }
      })
      
      await db.classSchedule.createMany({
        data: utcSchedules,
      })
    }

    // 5. Crear nuevas clases programadas
    let classesCreated = 0
    for (const cls of data.scheduledClasses) {
      const localTimeSlot = `${cls.startTime}-${cls.endTime}`
      
      // Convertir fecha y horario de hora local a UTC
      const utcData = convertTimeSlotToUTC(cls.date, localTimeSlot, userTimezone)

      // Verificar si el slot ya está ocupado por otra reserva
      const existingBooking = await db.classBooking.findUnique({
        where: {
          teacherId_day_timeSlot: {
            teacherId: cls.teacherId,
            day: utcData.day,
            timeSlot: utcData.timeSlot,
          },
        },
      })

      if (!existingBooking) {
        await db.classBooking.create({
          data: {
            studentId: enrollment.studentId,
            teacherId: cls.teacherId,
            enrollmentId: enrollmentId,
            day: utcData.day,
            timeSlot: utcData.timeSlot,
            status: 'CONFIRMED',
          },
        })
        classesCreated++
      } else if (existingBooking.enrollmentId === enrollmentId && existingBooking.status === 'CANCELLED') {
        // Reactivar la clase si era de esta misma inscripción y estaba cancelada
        await db.classBooking.update({
          where: { id: existingBooking.id },
          data: {
            status: 'CONFIRMED',
            cancelledAt: null,
            cancelledBy: null,
          },
        })
        classesCreated++
      } else {
        console.warn(`Slot already booked: ${utcData.day} ${utcData.timeSlot} for teacher ${cls.teacherId}`)
      }
    }

    console.log(`[Enrollment Update] Created ${classesCreated} new class bookings`)

    revalidatePath('/admin/enrollments')
    revalidatePath('/admin/classes')
    revalidatePath('/teacher/classes')
    revalidatePath('/student/classes')

    return {
      success: true,
      message: `Inscripción actualizada. ${cancelledBookings.count} clases canceladas, ${classesCreated} clases nuevas programadas.`,
      cancelledCount: cancelledBookings.count,
      createdCount: classesCreated,
    }
  } catch (error) {
    console.error('Error updating enrollment with schedule:', error)
    return { success: false, error: 'Error al actualizar la inscripción con horarios' }
  }
}

// Get active enrollments for a student
export async function getActiveEnrollmentsForStudent(studentId: string) {
  try {
    const enrollments = await db.enrollment.findMany({
      where: {
        studentId,
        status: EnrollmentStatus.ACTIVE,
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            description: true,
            level: true,
          },
        },
        academicPeriod: {
          select: {
            id: true,
            name: true,
            isActive: true,
          },
        },
      },
      orderBy: {
        enrollmentDate: 'desc',
      },
    })

    return { success: true, data: enrollments }
  } catch (error) {
    console.error('Error fetching student enrollments:', error)
    return { success: false, error: 'Error al cargar inscripciones' }
  }
}

// Delete enrollment
export async function deleteEnrollment(id: string) {
  try {
    await db.enrollment.delete({
      where: { id },
    })

    revalidatePath('/admin/enrollments')
    return { success: true }
  } catch (error) {
    console.error('Error deleting enrollment:', error)
    return { success: false, error: 'Error al eliminar la inscripción' }
  }
}

// Get available students (not enrolled in a specific course)
export async function getAvailableStudents(courseId: string) {
  try {
    const enrolledStudents = await db.enrollment.findMany({
      where: { courseId },
      select: { studentId: true },
    })

    const enrolledStudentIds = enrolledStudents.map((e) => e.studentId)

    const students = await db.user.findMany({
      where: {
        roles: {
          has: 'STUDENT',
        },
        id: {
          notIn: enrolledStudentIds,
        },
        status: EnrollmentStatus.ACTIVE,
      },
      select: {
        id: true,
        name: true,
        lastName: true,
        email: true,
        image: true,
      },
      orderBy: {
        name: 'asc',
      },
    })

    return students
  } catch (error) {
    console.error('Error fetching available students:', error)
    throw new Error('Failed to fetch available students')
  }
}

// Get available courses for a student
export async function getAvailableCoursesForStudent(studentId: string) {
  try {
    const enrolledCourses = await db.enrollment.findMany({
      where: { studentId },
      select: { courseId: true },
    })

    const enrolledCourseIds = enrolledCourses.map((e) => e.courseId)

    const courses = await db.course.findMany({
      where: {
        id: {
          notIn: enrolledCourseIds,
        },
        isPublished: true,
      },
      select: {
        id: true,
        title: true,
        description: true,
        level: true,
        _count: {
          select: {
            modules: true,
          },
        },
      },
      orderBy: {
        title: 'asc',
      },
    })

    return courses
  } catch (error) {
    console.error('Error fetching available courses:', error)
    throw new Error('Failed to fetch available courses')
  }
}

// Get all students for enrollment
export async function getAllStudents() {
  try {
    const students = await db.user.findMany({
      where: {
        roles: {
          has: 'STUDENT',
        },
        status: EnrollmentStatus.ACTIVE,
      },
      select: {
        id: true,
        name: true,
        lastName: true,
        email: true,
        image: true,
      },
      orderBy: {
        name: 'asc',
      },
    })

    return students
  } catch (error) {
    console.error('Error fetching students:', error)
    throw new Error('Failed to fetch students')
  }
}

// Get all published courses
export async function getPublishedCourses() {
  try {
    const courses = await db.course.findMany({
      where: {
        isPublished: true,
      },
      select: {
        id: true,
        title: true,
        description: true,
        level: true,
        classDuration: true,
        isSynchronous: true,
        _count: {
          select: {
            modules: true,
            teacherCourses: true,
          },
        },
      },
      orderBy: {
        title: 'asc',
      },
    })

    return courses
  } catch (error) {
    console.error('Error fetching published courses:', error)
    throw new Error('Failed to fetch published courses')
  }
}

// Get active academic periods (current period by date range)
export async function getActiveAcademicPeriods() {
  try {
    // Buscar el período que CONTIENE la fecha actual (por rango de fechas)
    // Usamos UTC para comparaciones consistentes con la DB
    const now = new Date()
    const todayStartUTC = getStartOfDayUTC(now)
    const todayEndUTC = getEndOfDayUTC(now)
    const periods = await db.academicPeriod.findMany({
      where: {
        startDate: { lte: todayEndUTC },
        endDate: { gte: todayStartUTC },
        isSpecialWeek: false, // Excluir semanas especiales
      },
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
        isActive: true,
      },
      orderBy: {
        startDate: 'desc',
      },
    })

    return periods
  } catch (error) {
    console.error('Error fetching active academic periods:', error)
    throw new Error('Failed to fetch active academic periods')
  }
}

// Get active and future academic periods (for pre-enrollments)
// Busca períodos actuales (por rango de fechas) y futuros
export async function getActiveAndFutureAcademicPeriods() {
  try {
    // Usamos UTC para comparaciones consistentes con la DB
    const now = new Date()
    const todayStartUTC = getStartOfDayUTC(now)
    const todayEndUTC = getEndOfDayUTC(now)
    const periods = await db.academicPeriod.findMany({
      where: {
        OR: [
          // Current periods (already started but not ended) - by date range
          {
            startDate: { lte: todayEndUTC },
            endDate: { gte: todayStartUTC },
          },
          // Future periods (haven't started yet)
          {
            startDate: { gt: todayEndUTC },
          },
        ],
        isSpecialWeek: false, // Excluir semanas especiales
      },
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
        isActive: true,
      },
      orderBy: {
        startDate: 'asc',
      },
    })

    return periods
  } catch (error) {
    console.error('Error fetching active and future academic periods:', error)
    throw new Error('Failed to fetch active and future academic periods')
  }
}

// Get all academic periods (for admin)
export async function getAllAcademicPeriods() {
  try {
    const periods = await db.academicPeriod.findMany({
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
        isActive: true,
      },
      orderBy: {
        startDate: 'desc',
      },
    })

    return periods
  } catch (error) {
    console.error('Error fetching academic periods:', error)
    throw new Error('Failed to fetch academic periods')
  }
}

// Activate pending enrollments when their academic period starts
export async function activatePendingEnrollments() {
  try {
    const today = getTodayStart()

    const result = await db.enrollment.updateMany({
      where: {
        status: EnrollmentStatus.PENDING,
        academicPeriod: {
          startDate: {
            lte: today,
          },
        },
      },
      data: {
        status: EnrollmentStatus.ACTIVE,
      },
    })

    console.log(`Activated ${result.count} pending enrollments`)
    revalidatePath('/admin/enrollments')

    return {
      success: true,
      count: result.count,
      message: `Se activaron ${result.count} pre-inscripciones`,
    }
  } catch (error) {
    console.error('Error activating pending enrollments:', error)
    return {
      success: false,
      error: 'Error al activar pre-inscripciones',
      count: 0,
    }
  }
}
