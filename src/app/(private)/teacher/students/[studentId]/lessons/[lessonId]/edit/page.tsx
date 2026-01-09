import { auth } from '@/auth'
import { redirect, notFound } from 'next/navigation'
import { getStudentLessonForEdit } from '@/lib/actions/student-lessons'
import { StudentLessonBuilder } from '@/components/teacher/student-lessons/student-lesson-builder'
import { mapContentToBlock } from '@/lib/content-mapper'

interface EditLessonPageProps {
  params: Promise<{
    studentId: string
    lessonId: string
  }>
}

export default async function EditStudentLessonPage({
  params,
}: EditLessonPageProps) {
  const { lessonId } = await params
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/auth/signin?callbackUrl=/teacher/students')
  }

  const isTeacher = session.user.roles?.includes('TEACHER')
  if (!isTeacher) {
    redirect('/dashboard')
  }

  const result = await getStudentLessonForEdit(lessonId, session.user.id)

  if (!result.success || !result.data) {
    notFound()
  }

  const lesson = result.data

  // Map contents to blocks
  const blocks = lesson.contents?.map((c) => mapContentToBlock(c as Parameters<typeof mapContentToBlock>[0])) || []

  return (
    <div className="h-[calc(100vh-4rem)]">
      <StudentLessonBuilder
        lesson={{
          id: lesson.id,
          title: lesson.title,
          description: lesson.description,
          duration: lesson.duration,
          blocks: blocks,
          videoUrl: lesson.videoUrl,
          summary: lesson.summary,
          transcription: lesson.transcription,
          isPublished: lesson.isPublished,
        }}
        studentName={`${lesson.student?.name || ''} ${lesson.student?.lastName || ''}`}
        courseName={lesson.enrollment?.course.title || ''}
      />
    </div>
  )
}
