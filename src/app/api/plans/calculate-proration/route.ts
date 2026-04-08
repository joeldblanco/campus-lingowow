import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getStartOfDayUTC } from '@/lib/utils/date'
import {
  DEFAULT_TEACHER_TIMEZONE,
  getEnrollmentAdvanceCutoff,
  getUtcOccurrenceForDate,
  isOccurrenceEligibleForSelfService,
  resolveEligibleEnrollmentWindow,
} from '@/lib/enrollments/self-service-cutoff'

interface ScheduleSlot {
  teacherId?: string
  dayOfWeek: number // 0-6, 0 = Sunday
  startTime: string // HH:MM
  endTime: string // HH:MM
  teacherTimezone?: string | null
}

/**
 * Calcula el número de clases que ocurrirán en un período dado
 * basándose en el horario seleccionado
 */
function calculateClassesInPeriod(
  startDate: Date,
  endDate: Date,
  schedule: ScheduleSlot[],
  now: Date
): number {
  let classCount = 0
  const currentDate = getStartOfDayUTC(startDate)
  
  console.log('[calculateClassesInPeriod] Input:', {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    schedule,
  })

  while (currentDate <= endDate) {
    const dayOfWeek = currentDate.getUTCDay()
    const scheduleForDay = schedule.find((slot) => slot.dayOfWeek === dayOfWeek)

    if (scheduleForDay) {
      const occurrenceAt = getUtcOccurrenceForDate(currentDate, scheduleForDay)
      const isEligibleOccurrence =
        occurrenceAt.getTime() >= startDate.getTime() &&
        occurrenceAt.getTime() <= endDate.getTime() &&
        isOccurrenceEligibleForSelfService(occurrenceAt, scheduleForDay, now)

      if (isEligibleOccurrence) {
        console.log('[calculateClassesInPeriod] Match found:', {
          date: currentDate.toISOString(),
          occurrenceAt: occurrenceAt.toISOString(),
          dayOfWeek,
          slot: scheduleForDay,
        })
        classCount++
      }
    }
    
    // Avanzar al siguiente día
    currentDate.setUTCDate(currentDate.getUTCDate() + 1)
  }

  console.log('[calculateClassesInPeriod] Result:', classCount)
  return classCount
}

/**
 * Calcula el prorrateo de un plan basado en el horario seleccionado
 * y el período académico actual
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { planId, schedule } = body as {
      planId: string
      schedule: ScheduleSlot[]
    }

    if (!planId || !schedule || schedule.length === 0) {
      return NextResponse.json(
        { error: 'planId y schedule son requeridos' },
        { status: 400 }
      )
    }

    // Obtener el plan
    const plan = await db.plan.findUnique({
      where: { id: planId },
      include: {
        course: true,
      },
    })

    if (!plan) {
      return NextResponse.json(
        { error: 'Plan no encontrado' },
        { status: 404 }
      )
    }

    const teacherIds = [
      ...new Set(
        schedule
          .map((slot) => slot.teacherId)
          .filter((teacherId): teacherId is string => Boolean(teacherId))
      ),
    ]
    const teachers = teacherIds.length
      ? await db.user.findMany({
          where: { id: { in: teacherIds } },
          select: { id: true, timezone: true },
        })
      : []
    const teacherTimezones = new Map(
      teachers.map((teacher) => [teacher.id, teacher.timezone || DEFAULT_TEACHER_TIMEZONE])
    )
    const scheduleWithTeacherTimezones = schedule.map((slot) => ({
      ...slot,
      teacherTimezone: slot.teacherId
        ? teacherTimezones.get(slot.teacherId) || DEFAULT_TEACHER_TIMEZONE
        : DEFAULT_TEACHER_TIMEZONE,
    }))

    // Obtener el período académico actual basándose en el RANGO DE FECHAS (no en isActive)
    // Las fechas en la DB están en UTC, así que comparamos en UTC
    const now = new Date()
    const todayStartUTC = getStartOfDayUTC(now)
    const enrollmentCutoff = getEnrollmentAdvanceCutoff(now)
    
    console.log('[Proration] Today UTC start:', {
      todayStartUTC: todayStartUTC.toISOString(),
      enrollmentCutoff: enrollmentCutoff.toISOString(),
    })

    const upcomingPeriods = await db.academicPeriod.findMany({
      where: {
        endDate: { gte: todayStartUTC },
        isSpecialWeek: false,
      },
      orderBy: { startDate: 'asc' },
    })

    let periodStart = new Date(enrollmentCutoff)
    let periodEnd = new Date(enrollmentCutoff)
    periodEnd.setUTCDate(periodEnd.getUTCDate() + 28)
    let useDefaultPeriod = true
    let periodName = 'Período por defecto'
    let enrollmentStart = new Date(enrollmentCutoff)

    const eligibleWindow = resolveEligibleEnrollmentWindow(
      upcomingPeriods,
      scheduleWithTeacherTimezones,
      now
    )

    if (eligibleWindow) {
      periodStart = new Date(eligibleWindow.period.startDate)
      periodEnd = new Date(eligibleWindow.period.endDate)
      useDefaultPeriod = false
      periodName = eligibleWindow.period.name
      enrollmentStart = new Date(eligibleWindow.enrollmentStart)
      console.log('[Proration] Using eligible period:', eligibleWindow.period.name, {
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
        firstClassAt: eligibleWindow.firstClassAt.toISOString(),
        enrollmentStart: enrollmentStart.toISOString(),
      })
    } else {
      console.log('[Proration] No eligible academic period found, using default 4-week window')
    }
    
    console.log('[Proration] Period:', {
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      today: now.toISOString(),
      enrollmentStart: enrollmentStart.toISOString(),
      useDefaultPeriod,
    })

    console.log('[Proration] Schedule received:', schedule)

    // Calcular el número total de clases en el período completo
    const totalClassesInFullPeriod = calculateClassesInPeriod(
      periodStart,
      periodEnd,
      scheduleWithTeacherTimezones,
      now
    )

    console.log('[Proration] Total classes in full period:', totalClassesInFullPeriod)

    // Calcular el número de clases desde hoy hasta el fin del período
    const classesFromNow = calculateClassesInPeriod(
      enrollmentStart,
      periodEnd,
      scheduleWithTeacherTimezones,
      now
    )

    console.log('[Proration] Classes from now:', classesFromNow)

    // Calcular el precio prorrateado
    let proratedPrice = plan.price
    const proratedClasses = classesFromNow

    // Si no hay período académico o el prorrateo está deshabilitado, usar precio completo
    // Si hay clases calculadas, calcular el prorrateo
    if (plan.allowProration && totalClassesInFullPeriod > 0 && !useDefaultPeriod) {
      // Calcular el precio por clase
      const pricePerClass = plan.price / totalClassesInFullPeriod
      
      // Calcular el precio prorrateado
      proratedPrice = pricePerClass * classesFromNow
    } else if (useDefaultPeriod) {
      // Sin período académico, usar precio completo
      proratedPrice = plan.price
    }

    // Calcular días restantes en el período
    const daysRemaining = Math.ceil(
      (periodEnd.getTime() - enrollmentStart.getTime()) / (1000 * 60 * 60 * 24)
    )

    // Calcular semanas restantes
    const weeksRemaining = Math.ceil(daysRemaining / 7)

    return NextResponse.json({
      planId: plan.id,
      planName: plan.name,
      originalPrice: plan.price,
      proratedPrice: Math.round(proratedPrice * 100) / 100, // Redondear a 2 decimales
      classesFromNow: proratedClasses,
      totalClassesInFullPeriod,
      classesPerWeek: schedule.length,
      periodName,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      enrollmentStart: enrollmentStart.toISOString(),
      daysRemaining,
      weeksRemaining,
      allowProration: plan.allowProration,
      schedule,
    })
  } catch (error) {
    console.error('Error calculating proration:', error)
    return NextResponse.json(
      { error: 'Error al calcular el prorrateo' },
      { status: 500 }
    )
  }
}
