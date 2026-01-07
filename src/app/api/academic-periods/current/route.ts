import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getStartOfDayUTC, getEndOfDayUTC } from '@/lib/utils/date'

export async function GET() {
  try {
    // Buscar el período que CONTIENE la fecha actual (por rango de fechas)
    // Las fechas en la DB están en UTC
    const now = new Date()
    const todayStartUTC = getStartOfDayUTC(now)
    const todayEndUTC = getEndOfDayUTC(now)
    
    // Un período es "actual" si: startDate <= hoy <= endDate
    const currentPeriod = await db.academicPeriod.findFirst({
      where: {
        startDate: { lte: todayEndUTC },
        endDate: { gte: todayStartUTC },
        isSpecialWeek: false, // Excluir semanas especiales por defecto
      },
      include: {
        season: true,
      },
      orderBy: { startDate: 'desc' }, // Si hay múltiples, tomar el más reciente
    })

    if (!currentPeriod) {
      // Si no hay período actual, buscar el próximo período futuro
      const nextPeriod = await db.academicPeriod.findFirst({
        where: {
          startDate: { gt: todayEndUTC },
          isSpecialWeek: false,
        },
        include: {
          season: true,
        },
        orderBy: { startDate: 'asc' },
      })
      
      if (nextPeriod) {
        return NextResponse.json({
          ...nextPeriod,
          isFuturePeriod: true,
        })
      }
      
      return NextResponse.json(
        { error: 'No hay período académico actual ni próximo' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      ...currentPeriod,
      isFuturePeriod: false,
    })
  } catch (error) {
    console.error('Error fetching current academic period:', error)
    return NextResponse.json(
      { error: 'Error al obtener el período académico actual' },
      { status: 500 }
    )
  }
}
