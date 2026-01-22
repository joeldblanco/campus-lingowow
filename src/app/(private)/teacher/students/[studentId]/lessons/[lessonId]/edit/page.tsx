import { auth } from '@/auth'
import { redirect, notFound } from 'next/navigation'
import { getStudentLessonForEdit } from '@/lib/actions/student-lessons'
import { mapContentToBlock } from '@/lib/content-mapper'
import { TeacherLessonBuilderWrapper } from './client-wrapper'

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
    <TeacherLessonBuilderWrapper
      lesson={{
        id: lesson.id,
        title: lesson.title,
        description: lesson.description,
        duration: lesson.duration,
        blocks: blocks,
        order: lesson.order,
        moduleId: null,
        isPublished: lesson.isPublished,
        studentId: lesson.studentId,
        teacherId: lesson.teacherId,
        enrollmentId: lesson.enrollmentId,
      }}
      studentName={`${lesson.student?.name || ''} ${lesson.student?.lastName || ''}`}
      courseName={lesson.enrollment?.course.title || ''}
    />
  )
}
