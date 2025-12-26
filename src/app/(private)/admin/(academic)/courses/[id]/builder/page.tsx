import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { CourseBuilder } from '@/components/admin/course-builder/course-builder'
import { getCourseForBuilder } from '@/lib/actions/course-builder'
import { CourseBuilderLoadingSkeleton } from '@/components/admin/course-builder/course-builder-loading-skeleton'

interface CourseBuilderPageProps {
  params: Promise<{
    id: string
  }>
}

export const metadata: Metadata = {
  title: 'Course Builder | Admin | Lingowow',
  description: 'Construye y edita cursos, módulos y lecciones',
}

export default async function CourseBuilderPage({ params }: CourseBuilderPageProps) {
  const { id } = await params

  try {
    const result = await getCourseForBuilder(id)

    if (!result.success || !result.course) {
      if (result.error === 'Unauthorized') {
        // handle unauthorized, maybe redirect or show error
        // for now, just 404
        notFound()
      }
      notFound()
    }

    return (
      <div className="container py-8">
        <Suspense fallback={<CourseBuilderLoadingSkeleton />}>
          <CourseBuilder initialCourse={result.course} />
        </Suspense>
      </div>
    )
  } catch (error) {
    console.error('Error loading course for builder:', error)
    notFound()
  }
}
