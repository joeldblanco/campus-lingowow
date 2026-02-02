import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getPeriods } from '@/lib/actions/academic-period'

export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const currentYear = new Date().getFullYear()
    const today = new Date()
    
    // 1. Períodos del año actual que ya hayan iniciado
    const currentYearResult = await getPeriods(currentYear)
    const currentYearPeriods = currentYearResult.success ? currentYearResult.periods || [] : []
    
    const startedPeriods = currentYearPeriods.filter(period => 
      new Date(period.startDate) <= today
    )
    
    // 2. Último período del año anterior
    const previousYearResult = await getPeriods(currentYear - 1)
    const previousYearPeriods = previousYearResult.success ? previousYearResult.periods || [] : []
    
    const lastPreviousPeriod = previousYearPeriods
      .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())[0]
    
    // Combinar y ordenar
    const allPeriods = [...startedPeriods]
    if (lastPreviousPeriod) {
      // Agregar el año al nombre del último período del año anterior
      const modifiedPeriod = {
        ...lastPreviousPeriod,
        name: `${lastPreviousPeriod.name} ${currentYear - 1}`
      }
      allPeriods.push(modifiedPeriod)
    }
    
    const sortedPeriods = allPeriods.sort((a, b) => 
      new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
    )
    
    const periods = sortedPeriods.map(period => ({
      id: period.id,
      name: period.name,
      startDate: period.startDate,
      endDate: period.endDate,
    }))

    return NextResponse.json({ success: true, periods })
  } catch (error) {
    console.error('Error obteniendo períodos académicos para earnings:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
