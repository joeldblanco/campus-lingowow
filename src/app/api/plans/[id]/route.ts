import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(req.url)
    const language = searchParams.get('language')

    const plan = await db.plan.findUnique({
      where: { id },
      include: {
        course: true,
        product: {
          include: {
            course: true,
          },
        },
        features: {
          include: {
            feature: true,
          },
        },
        pricing: true,
      },
    })

    if (!plan) {
      return NextResponse.json(
        { error: 'Plan no encontrado' },
        { status: 404 }
      )
    }

    // If language is specified, check for language-specific courseId from PlanPricing
    let effectiveCourseId = plan.courseId || plan.course?.id || plan.product?.course?.id || null
    let effectiveCourse = plan.course || plan.product?.course || null

    if (language) {
      const languagePricing = plan.pricing?.find(p => p.language === language && p.isActive)
      if (languagePricing?.courseId) {
        // Fetch the course for this language
        const languageCourse = await db.course.findUnique({
          where: { id: languagePricing.courseId },
        })
        if (languageCourse) {
          effectiveCourseId = languageCourse.id
          effectiveCourse = languageCourse
        }
      }
    }

    return NextResponse.json({
      ...plan,
      // Override courseId and course with language-specific values if applicable
      effectiveCourseId,
      effectiveCourse,
    })
  } catch (error) {
    console.error('Error fetching plan:', error)
    return NextResponse.json(
      { error: 'Error al obtener el plan' },
      { status: 500 }
    )
  }
}
