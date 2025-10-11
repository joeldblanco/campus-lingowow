import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const currentPeriod = await db.academicPeriod.findFirst({
      where: {
        isActive: true,
      },
      include: {
        season: true,
      },
    })

    if (!currentPeriod) {
      return NextResponse.json(
        { error: 'No hay período académico activo' },
        { status: 404 }
      )
    }

    return NextResponse.json(currentPeriod)
  } catch (error) {
    console.error('Error fetching current academic period:', error)
    return NextResponse.json(
      { error: 'Error al obtener el período académico actual' },
      { status: 500 }
    )
  }
}
