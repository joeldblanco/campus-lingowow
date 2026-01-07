import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getStartOfDayUTC, getEndOfDayUTC } from '@/lib/utils/date'

interface ScheduleSlot {
  dayOfWeek: number // 0-6, 0 = Sunday
  startTime: string // HH:MM
  endTime: string // HH:MM
}

/**
 * Calcula el número de clases que ocurrirán en un período dado
 * basándose en el horario seleccionado
 */
function calculateClassesInPeriod(
  startDate: Date,
  endDate: Date,
  schedule: ScheduleSlot[]
): number {
  let classCount = 0
  const currentDate = new Date(startDate)
  
  console.log('[calculateClassesInPeriod] Input:', {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    schedule,
  })

  while (currentDate <= endDate) {
    const dayOfWeek = currentDate.getDay()
    
    // Verificar si hay una clase programada para este día
    const hasClassToday = schedule.some(slot => {
      const matches = slot.dayOfWeek === dayOfWeek
      if (matches) {
        console.log('[calculateClassesInPeriod] Match found:', {
          date: currentDate.toISOString(),
          dayOfWeek,
          slot,
        })
      }
      return matches
    })
    
    if (hasClassToday) {
      classCount++
    }
    
    // Avanzar al siguiente día
    currentDate.setDate(currentDate.getDate() + 1)
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

    // Obtener el período académico actual basándose en el RANGO DE FECHAS (no en isActive)
    // Las fechas en la DB están en UTC, así que comparamos en UTC
    const now = new Date()
    // Obtener el inicio del día actual en UTC para comparaciones consistentes
    const todayStartUTC = getStartOfDayUTC(now)
    const todayEndUTC = getEndOfDayUTC(now)
    
    console.log('[Proration] Today UTC range:', {
      todayStartUTC: todayStartUTC.toISOString(),
      todayEndUTC: todayEndUTC.toISOString(),
    })
    
    // PASO 1: Buscar el período que CONTIENE la fecha actual (por rango de fechas)
    // Un período es "actual" si: startDate <= hoy <= endDate
    const currentPeriod = await db.academicPeriod.findFirst({
      where: { 
        startDate: { lte: todayEndUTC },
        endDate: { gte: todayStartUTC },
        isSpecialWeek: false, // Excluir semanas especiales
      },
      orderBy: { startDate: 'desc' }, // Si hay múltiples, tomar el más reciente
    })

    let periodStart: Date = new Date(now)
    let periodEnd: Date = new Date(now)
    periodEnd.setDate(periodEnd.getDate() + 28) // Default: 4 semanas
    let useDefaultPeriod = true
    let periodName = 'Período por defecto'

    if (currentPeriod) {
      periodStart = new Date(currentPeriod.startDate)
      periodEnd = new Date(currentPeriod.endDate)
      useDefaultPeriod = false
      periodName = currentPeriod.name
      console.log('[Proration] Found current period by date range:', currentPeriod.name, {
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
      })
    }
    
    // PASO 2: Si no hay período actual, buscar el próximo período futuro
    if (!currentPeriod) {
      console.log('[Proration] No current period found, looking for next future period')
      const nextPeriod = await db.academicPeriod.findFirst({
        where: {
          startDate: { gt: todayEndUTC },
          isSpecialWeek: false,
        },
        orderBy: { startDate: 'asc' },
      })
      
      if (nextPeriod) {
        periodStart = new Date(nextPeriod.startDate)
        periodEnd = new Date(nextPeriod.endDate)
        useDefaultPeriod = false
        periodName = nextPeriod.name
        console.log('[Proration] Using next future period:', nextPeriod.name)
      } else {
        console.log('[Proration] No current or upcoming period found, using default period')
      }
    }
    
    console.log('[Proration] Period:', {
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      today: now.toISOString(),
      useDefaultPeriod,
    })
    
    // La fecha de inicio es hoy o el inicio del período, lo que sea más tarde
    const enrollmentStart = now > periodStart ? now : periodStart

    console.log('[Proration] Schedule received:', schedule)

    // Calcular el número total de clases en el período completo
    const totalClassesInFullPeriod = calculateClassesInPeriod(
      periodStart,
      periodEnd,
      schedule
    )

    console.log('[Proration] Total classes in full period:', totalClassesInFullPeriod)

    // Calcular el número de clases desde hoy hasta el fin del período
    const classesFromNow = calculateClassesInPeriod(
      enrollmentStart,
      periodEnd,
      schedule
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
