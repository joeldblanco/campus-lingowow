import { Suspense } from 'react'
import { auth } from '@/auth'
import { getCourseForPublicView, getCourseProgress } from '@/lib/actions/courses'
import { CourseView } from '@/components/courses/course-view'
import { CourseLoadingSkeleton } from '@/components/courses/course-loading-skeleton'
import { notFound, redirect } from 'next/navigation'

interface CoursePageProps {
  params: Promise<{
    courseId: string
  }>
}

export default async function CoursePage({ params }: CoursePageProps) {
  const { courseId } = await params
  const session = await auth()
  const course = await getCourseForPublicView(courseId, session?.user?.id)

  if (!course) {
    notFound()
  }

  // If user is not enrolled, redirect to preview
  if (!course.isEnrolled) {
    redirect(`/courses/${courseId}/preview`)
  }

  // Get course progress for enrolled students
  const progress = session?.user?.id 
    ? await getCourseProgress(courseId, session.user.id)
    : null

  return (
    <div className="container mx-auto px-4 py-8">
      <Suspense fallback={<CourseLoadingSkeleton />}>
        <CourseView 
          course={course}
          progress={progress}
        />
      </Suspense>
    </div>
  )
}
