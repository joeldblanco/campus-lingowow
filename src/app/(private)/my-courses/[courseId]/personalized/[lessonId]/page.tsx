import { Suspense } from 'react'
import { auth } from '@/auth'
import { notFound, redirect } from 'next/navigation'
import { getStudentLessonForView } from '@/lib/actions/student-lessons'
import { LessonHeader } from '@/components/lessons/lesson-header'
import { LessonContent } from '@/components/lessons/lesson-content'
import { LessonLoadingSkeleton } from '@/components/lessons/lesson-loading-skeleton'

interface PersonalizedLessonPageProps {
  params: Promise<{
    courseId: string
    lessonId: string
  }>
}

export default async function PersonalizedLessonPage({
  params,
}: PersonalizedLessonPageProps) {
  const { courseId, lessonId } = await params
  const session = await auth()

  if (!session?.user?.id) {
    redirect(`/auth/signin?callbackUrl=/my-courses/${courseId}/personalized/${lessonId}`)
  }

  const result = await getStudentLessonForView(lessonId, session.user.id)

  if (!result.success || !result.data) {
    notFound()
  }

  const lesson = result.data

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <LessonHeader
        title={lesson.title}
        subtitle={lesson.summary}
        courseTitle={lesson.enrollment?.course.title || ''}
        moduleTitle={`Contenido de ${lesson.teacher?.name || ''} ${lesson.teacher?.lastName || ''}`}
        courseId={courseId}
        progress={lesson.progress?.percentage ?? 0}
      />

      <main className="container mx-auto px-4 py-8 max-w-5xl space-y-8">
        <Suspense fallback={<LessonLoadingSkeleton />}>
          <LessonContent lesson={lesson as never} />
        </Suspense>
      </main>
    </div>
  )
}
