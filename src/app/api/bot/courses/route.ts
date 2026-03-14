import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Public endpoint for the CRM bot to fetch all published courses
// No auth required — returns only basic public course info

export async function GET() {
  try {
    const courses = await db.course.findMany({
      where: {
        isPublished: true,
      },
      select: {
        id: true,
        title: true,
        description: true,
        language: true,
        level: true,
        classDuration: true,
        isPersonalized: true,
        isSynchronous: true,
        image: true,
      },
      orderBy: { title: 'asc' },
    })

    return NextResponse.json({ courses })
  } catch (error) {
    console.error('[BOT API] Error fetching courses:', error)
    return NextResponse.json(
      { error: 'Error al obtener cursos' },
      { status: 500 }
    )
  }
}
