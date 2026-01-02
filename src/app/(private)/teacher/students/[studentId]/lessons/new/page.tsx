import { auth } from '@/auth'
import { redirect, notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { CreateLessonWrapper } from '@/components/teacher/student-lessons/create-lesson-wrapper'

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
    <CreateLessonWrapper
      studentId={studentId}
      studentName={`${enrollment.student.name} ${enrollment.student.lastName || ''}`}
      teacherId={session.user.id}
      enrollmentId={enrollmentId}
      courseName={enrollment.course.title}
    />
  )
}
