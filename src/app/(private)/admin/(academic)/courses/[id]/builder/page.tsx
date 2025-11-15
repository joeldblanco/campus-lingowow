import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { CourseBuilder } from '@/components/admin/course-builder/course-builder'
import { getCourseById } from '@/lib/actions/courses'
import { CourseBuilderLoadingSkeleton } from '@/components/admin/course-builder/course-builder-loading-skeleton'
import { CourseBuilderData } from '@/types/course-builder'

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
    const course = await getCourseById(id)
    
    if (!course) {
      notFound()
    }

    const courseBuilderData: CourseBuilderData = {
      id: course.id,
      title: course.title,
      description: course.description || '',
      language: course.language,
      level: course.level,
      classDuration: course.classDuration,
      image: (course as { image?: string }).image || '',
      isPublished: course.isPublished,
      createdById: course.createdById,
      modules: course.modules.map(module => ({
        id: module.id,
        title: module.title,
        description: module.description || '',
        level: module.level,
        order: module.order,
        objectives: (module as { objectives?: string }).objectives || '',
        isPublished: module.isPublished,
        lessons: [], // Will be loaded separately
        courseId: (module as { courseId?: string }).courseId || course.id,
      })),
    }

    return (
      <div className="container py-8">
        <Suspense fallback={<CourseBuilderLoadingSkeleton />}>
          <CourseBuilder initialCourse={courseBuilderData} />
        </Suspense>
      </div>
    )
  } catch (error) {
    console.error('Error loading course for builder:', error)
    notFound()
  }
}
