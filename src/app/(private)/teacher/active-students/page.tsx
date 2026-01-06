import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { getTeacherActiveStudents } from '@/lib/actions/teacher-courses'
import { TeacherActiveStudentsView } from '@/components/teacher/teacher-active-students-view'

export const metadata = {
  title: 'Estudiantes Activos | Profesor',
  description: 'Lista de estudiantes activos inscritos contigo',
}

export default async function TeacherActiveStudentsPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/auth/signin?callbackUrl=/teacher/active-students')
  }

  const isTeacher = session.user.roles?.includes('TEACHER')
  if (!isTeacher) {
    redirect('/dashboard')
  }

  const result = await getTeacherActiveStudents(session.user.id)

  if (!result.success) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center text-red-500">
          Error al cargar los estudiantes: {result.error}
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Estudiantes Activos</h1>
        <p className="text-muted-foreground mt-2">
          {result.totalCount} estudiantes han tenido clases contigo en los últimos 60 días
        </p>
      </div>

      <TeacherActiveStudentsView students={result.students} />
    </div>
  )
}
