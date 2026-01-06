import { auth } from '@/auth'
import { redirect, notFound } from 'next/navigation'
import { getCourseContentForTeacher } from '@/lib/actions/teacher-courses'
import { TeacherCourseContentView } from '@/components/teacher/teacher-course-content-view'

interface CoursePageProps {
  params: Promise<{
    courseId: string
  }>
}

export default async function TeacherCoursePage({ params }: CoursePageProps) {
  const { courseId } = await params
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/auth/signin?callbackUrl=/teacher/courses/' + courseId)
  }

  const isTeacher = session.user.roles?.includes('TEACHER')
  if (!isTeacher) {
    redirect('/dashboard')
  }

  const result = await getCourseContentForTeacher(courseId, session.user.id)

  if (!result.success || !result.course) {
    notFound()
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <TeacherCourseContentView course={result.course} />
    </div>
  )
}
