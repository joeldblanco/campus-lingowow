import { Suspense } from 'react'
import { CoursesContainer } from '@/components/admin/courses/courses-container'
import { CoursesLoadingSkeleton } from '@/components/admin/courses/courses-loading-skeleton'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Gestión de Cursos | Admin | Lingowow',
  description: 'Administra todos los cursos disponibles en la plataforma',
}

const CoursesAdminPage = () => {
  return (
    <div className="space-y-6">
      <Suspense fallback={<CoursesLoadingSkeleton />}>
        <CoursesContainer />
      </Suspense>
    </div>
  )
}

export default CoursesAdminPage
