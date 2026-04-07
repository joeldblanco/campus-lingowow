import { Suspense } from 'react'
import { auth } from '@/auth'
import { notFound, redirect } from 'next/navigation'
import { getLessonForTeacher } from '@/lib/actions/teacher-courses'
import { LessonHeader } from '@/components/lessons/lesson-header'
import { LessonContent } from '@/components/lessons/lesson-content'
import { LessonLoadingSkeleton } from '@/components/lessons/lesson-loading-skeleton'

interface TeacherLessonPageProps {
  params: Promise<{
    courseId: string
    lessonId: string
  }>
}

export default async function TeacherLessonPage({ params }: TeacherLessonPageProps) {
  const { courseId, lessonId } = await params
  const session = await auth()

  if (!session?.user?.id) {
    redirect(`/auth/signin?callbackUrl=/teacher/courses/${courseId}/lessons/${lessonId}`)
  }

  const isTeacher = session.user.roles?.includes('TEACHER')
  if (!isTeacher) {
    redirect('/dashboard')
  }

  const lesson = await getLessonForTeacher(courseId, lessonId, session.user.id)

  if (!lesson) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <LessonHeader
        title={lesson.title}
        subtitle={lesson.summary}
        courseTitle={lesson.module?.course.title || ''}
        moduleTitle={lesson.module?.title || ''}
        courseId={courseId}
        backUrl={`/teacher/courses/${courseId}`}
        progress={0}
      />

      <main className="container mx-auto px-4 py-8 max-w-5xl space-y-8">
        <Suspense fallback={<LessonLoadingSkeleton />}>
          <LessonContent lesson={lesson} isTeacher />
        </Suspense>
      </main>
    </div>
  )
}
