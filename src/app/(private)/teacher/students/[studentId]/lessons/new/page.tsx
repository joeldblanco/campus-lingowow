import { auth } from '@/auth'
import { redirect, notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { StudentLessonEditor } from '@/components/teacher/student-lessons'

interface NewLessonPageProps {
  params: Promise<{
    studentId: string
  }>
  searchParams: Promise<{
    enrollmentId?: string
  }>
}

export default async function NewStudentLessonPage({
  params,
  searchParams,
}: NewLessonPageProps) {
  const { studentId } = await params
  const { enrollmentId } = await searchParams
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/auth/signin?callbackUrl=/teacher/students')
  }

  const isTeacher = session.user.roles?.includes('TEACHER')
  if (!isTeacher) {
    redirect('/dashboard')
  }

  if (!enrollmentId) {
    redirect('/teacher/students')
  }

  // Obtener información del estudiante y la inscripción
  const enrollment = await db.enrollment.findFirst({
    where: {
      id: enrollmentId,
      studentId: studentId,
    },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          lastName: true,
        },
      },
      course: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  })

  if (!enrollment) {
    notFound()
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <StudentLessonEditor
        mode="create"
        studentId={studentId}
        studentName={`${enrollment.student.name} ${enrollment.student.lastName}`}
        teacherId={session.user.id}
        enrollmentId={enrollmentId}
        courseName={enrollment.course.title}
      />
    </div>
  )
}
