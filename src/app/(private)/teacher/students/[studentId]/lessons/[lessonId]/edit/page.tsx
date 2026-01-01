import { auth } from '@/auth'
import { redirect, notFound } from 'next/navigation'
import { getStudentLessonForEdit } from '@/lib/actions/student-lessons'
import { StudentLessonEditor } from '@/components/teacher/student-lessons'

interface EditLessonPageProps {
  params: Promise<{
    studentId: string
    lessonId: string
  }>
}

export default async function EditStudentLessonPage({
  params,
}: EditLessonPageProps) {
  const { studentId, lessonId } = await params
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

  return (
    <div className="container mx-auto py-8 px-4">
      <StudentLessonEditor
        mode="edit"
        studentId={studentId}
        studentName={`${lesson.student.name} ${lesson.student.lastName}`}
        teacherId={session.user.id}
        enrollmentId={lesson.enrollmentId}
        courseName={lesson.enrollment.course.title}
        initialData={{
          id: lesson.id,
          title: lesson.title,
          description: lesson.description,
          duration: lesson.duration,
          content: lesson.content,
          videoUrl: lesson.videoUrl,
          summary: lesson.summary,
          transcription: lesson.transcription,
          isPublished: lesson.isPublished,
        }}
      />
    </div>
  )
}
