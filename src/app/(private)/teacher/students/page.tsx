import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { getTeacherStudentsWithLessons } from '@/lib/actions/student-lessons'
import { StudentsWithLessonsView } from '@/components/teacher/student-lessons'

export const metadata = {
  title: 'Mis Estudiantes | Lecciones Personalizadas',
  description: 'Gestiona las lecciones personalizadas de tus estudiantes',
}

export default async function TeacherStudentsPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/auth/signin?callbackUrl=/teacher/students')
  }

  // Verificar que el usuario es profesor
  const isTeacher = session.user.roles?.includes('TEACHER')
  if (!isTeacher) {
    redirect('/dashboard')
  }

  const result = await getTeacherStudentsWithLessons(session.user.id)

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
        <h1 className="text-3xl font-bold">Mis Estudiantes</h1>
        <p className="text-muted-foreground mt-2">
          Gestiona las lecciones personalizadas para cada uno de tus estudiantes
        </p>
      </div>

      <StudentsWithLessonsView
        students={result.data || []}
        teacherId={session.user.id}
      />
    </div>
  )
}
