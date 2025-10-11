import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

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

    // Obtener el período académico actual
    const currentPeriod = await db.academicPeriod.findFirst({
      where: { isActive: true },
    })

    if (!currentPeriod) {
      return NextResponse.json(
        { error: 'No hay período académico activo' },
        { status: 404 }
      )
    }

    // Calcular fechas
    const today = new Date()
    const periodStart = new Date(currentPeriod.startDate)
    const periodEnd = new Date(currentPeriod.endDate)
    
    console.log('[Proration] Period:', {
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      today: today.toISOString(),
    })
    
    // La fecha de inicio es hoy o el inicio del período, lo que sea más tarde
    const enrollmentStart = today > periodStart ? today : periodStart

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

    if (plan.allowProration && totalClassesInFullPeriod > 0) {
      // Calcular el precio por clase
      const pricePerClass = plan.price / totalClassesInFullPeriod
      
      // Calcular el precio prorrateado
      proratedPrice = pricePerClass * classesFromNow
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
