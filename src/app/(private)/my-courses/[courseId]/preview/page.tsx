import { Suspense } from 'react'
import { auth } from '@/auth'
import { getCourseForPublicView } from '@/lib/actions/courses'
import { CoursePreview } from '@/components/courses/course-preview'
import { CourseLoadingSkeleton } from '@/components/courses/course-loading-skeleton'
import { notFound } from 'next/navigation'

interface CoursePreviewPageProps {
  params: Promise<{
    courseId: string
  }>
}

export default async function CoursePreviewPage({ params }: CoursePreviewPageProps) {
  const { courseId } = await params
  const session = await auth()
  const course = await getCourseForPublicView(courseId, session?.user?.id)

  if (!course) {
    notFound()
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Suspense fallback={<CourseLoadingSkeleton />}>
        <CoursePreview 
          course={course}
          isAuthenticated={!!session?.user}
        />
      </Suspense>
    </div>
  )
}
