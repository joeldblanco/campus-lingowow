import { Suspense } from 'react'
import { auth } from '@/auth'
import { getLessonForStudent } from '@/lib/actions/lessons'
import { getCourseModuleProgress } from '@/lib/actions/courses'
import { notFound, redirect } from 'next/navigation'
import { LessonHeader } from '@/components/lessons/lesson-header'
import { LessonContent } from '@/components/lessons/lesson-content'
import { LessonLoadingSkeleton } from '@/components/lessons/lesson-loading-skeleton'

interface LessonPageProps {
  params: Promise<{
    courseId: string
    lessonId: string
  }>
}

export default async function LessonPage({ params }: LessonPageProps) {
  const { courseId, lessonId } = await params
  const session = await auth()

  if (!session?.user?.id) {
    redirect(`/auth/signin?callbackUrl=/my-courses/${courseId}/lessons/${lessonId}`)
  }

  const lesson = await getLessonForStudent(lessonId, courseId, session.user.id)

  if (!lesson) {
    notFound()
  }

  // #92: prevent deep-linking into a lesson whose module is locked by a blocking
  // exam the student hasn't passed yet.
  if (lesson.module?.id) {
    const moduleProgress = await getCourseModuleProgress(courseId, session.user.id)
    const moduleState = moduleProgress.find((m) => m.moduleId === lesson.module?.id)
    if (moduleState?.isLocked) {
      redirect(`/my-courses/${courseId}`)
    }
  }

  // Check if all activities are completed
  // const areActivitiesCompleted = lesson.activities.length === 0 || lesson.activities.every(a => a.isCompleted)

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <LessonHeader
        title={lesson.title}
        subtitle={lesson.summary}
        courseTitle={lesson.module?.course.title || ''}
        moduleTitle={lesson.module?.title || ''}
        courseId={courseId}
        progress={40} // Example progress, we need to fetch real progress
      />

      <main className="container mx-auto px-4 py-8 max-w-5xl space-y-8">
        <Suspense fallback={<LessonLoadingSkeleton />}>
          <LessonContent lesson={lesson} />
        </Suspense>
      </main>
    </div>
  )
}
