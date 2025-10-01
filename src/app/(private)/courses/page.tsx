import { Suspense } from 'react'
import { auth } from '@/auth'
import { getCoursesForPublicView } from '@/lib/actions/courses'
import { CoursesContainer } from '@/components/courses/courses-container'
import { CoursesLoadingSkeleton } from '@/components/courses/courses-loading-skeleton'

export default async function CoursesPage() {
  const session = await auth()
  const courses = await getCoursesForPublicView(session?.user?.id)

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Cursos Disponibles</h1>
        <p className="text-gray-600">
          Explora nuestros cursos de idiomas y comienza tu aprendizaje
        </p>
      </div>

      <Suspense fallback={<CoursesLoadingSkeleton />}>
        <CoursesContainer courses={courses} isAuthenticated={!!session?.user} />
      </Suspense>
    </div>
  )
}
