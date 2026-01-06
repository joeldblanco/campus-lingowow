import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { getTeacherActiveCourses } from '@/lib/actions/teacher-courses'
import { TeacherCoursesView } from '@/components/teacher/teacher-courses-view'

export const metadata = {
  title: 'Mis Cursos | Profesor',
  description: 'Cursos activos y material disponible',
}

export default async function TeacherCoursesPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/auth/signin?callbackUrl=/teacher/courses')
  }

  const isTeacher = session.user.roles?.includes('TEACHER')
  if (!isTeacher) {
    redirect('/dashboard')
  }

  const result = await getTeacherActiveCourses(session.user.id)

  if (!result.success) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center text-red-500">
          Error al cargar los cursos: {result.error}
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Mis Cursos</h1>
        <p className="text-muted-foreground mt-2">
          Explora el material de tus cursos activos
        </p>
      </div>

      <TeacherCoursesView courses={result.courses} />
    </div>
  )
}
