import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getPeriods } from '@/lib/actions/academic-period'

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Reutilizar el Server Action existente
    // Obtener períodos de todos los años (no filtrar por año específico)
    const currentYear = new Date().getFullYear()
    
    // Obtener períodos de los últimos 3 años y próximos 2 años
    const years = [currentYear - 3, currentYear - 2, currentYear - 1, currentYear, currentYear + 1, currentYear + 2]
    const allPeriods = []
    
    for (const year of years) {
      const result = await getPeriods(year)
      if (result.success && result.periods) {
        allPeriods.push(...result.periods)
      }
    }

    // Ordenar por fecha de inicio (más recientes primero)
    const sortedPeriods = allPeriods.sort((a, b) => 
      new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
    )

    // Simplificar la respuesta (solo campos necesarios)
    const periods = sortedPeriods.map(period => ({
      id: period.id,
      name: period.name,
      startDate: period.startDate,
      endDate: period.endDate,
    }))

    return NextResponse.json({
      success: true,
      periods,
    })
  } catch (error) {
    console.error('Error obteniendo períodos académicos:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
