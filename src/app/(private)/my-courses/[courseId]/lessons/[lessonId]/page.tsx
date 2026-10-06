import { Suspense } from 'react'
import { auth } from '@/auth'
import { getCourseLessonNavigation, getLessonForStudent } from '@/lib/actions/lessons'
import { getCourseModuleProgress } from '@/lib/actions/courses'
import { notFound, redirect } from 'next/navigation'
import { LessonHeader } from '@/components/lessons/lesson-header'
import { LessonContent } from '@/components/lessons/lesson-content'
import { LessonLoadingSkeleton } from '@/components/lessons/lesson-loading-skeleton'
import { guidedLessonStorageKey, isGuidedLessonPilot } from '@/lib/lesson-pilot'

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

  const navigation = await getCourseLessonNavigation(courseId, lessonId, session.user.id)

  // #92: prevent deep-linking into a lesson whose module is locked by a blocking
  // exam the student hasn't passed yet.
  if (lesson.module?.id) {
    const moduleProgress = await getCourseModuleProgress(courseId, session.user.id)
    const moduleState = moduleProgress.find((m) => m.moduleId === lesson.module?.id)
    if (moduleState?.isLocked) {
      redirect(`/my-courses/${courseId}`)
    }
  }

  const isPilot = isGuidedLessonPilot(lessonId, courseId)

  // Check if all activities are completed
  // const areActivitiesCompleted = lesson.activities.length === 0 || lesson.activities.every(a => a.isCompleted)

  return (
    <div className={isPilot ? 'min-h-screen bg-[#faf8f4] pb-8' : 'min-h-screen bg-gray-50 pb-20'}>
      <LessonHeader
        title={lesson.title}
        subtitle={isPilot ? null : lesson.summary}
        courseTitle={lesson.module?.course.title || ''}
        moduleTitle={lesson.module?.title || ''}
        courseId={courseId}
        progress={navigation?.isCompleted ? 100 : 0}
      />

      <main className={`container mx-auto px-4 py-8 space-y-8 ${isPilot ? 'max-w-7xl' : 'max-w-5xl'}`}>
        {isPilot && <h2 className="font-serif text-4xl font-bold text-[#10245c] sm:text-6xl">{lesson.title}</h2>}
        <Suspense fallback={<LessonLoadingSkeleton />}>
          <LessonContent
            lesson={lesson}
            courseId={courseId}
            navigation={navigation}
            guidedStorageKey={isPilot ? guidedLessonStorageKey(session.user.id, courseId, lessonId) : undefined}
          />
        </Suspense>
      </main>
    </div>
  )
}
