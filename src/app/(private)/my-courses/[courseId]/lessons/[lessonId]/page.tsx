import { Suspense } from 'react'
import { auth } from '@/auth'
import { getLessonForStudent } from '@/lib/actions/lessons'
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

    const lesson = await getLessonForStudent(lessonId, session.user.id)

    if (!lesson) {
        notFound()
    }

    // Check if all activities are completed
    const areActivitiesCompleted = lesson.activities.length === 0 || lesson.activities.every(a => a.isCompleted)

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <LessonHeader
                title={lesson.title}
                subtitle={lesson.summary}
                courseTitle={lesson.module.course.title}
                moduleTitle={lesson.module.title}
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
