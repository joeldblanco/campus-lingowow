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
    <div className="container py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Cursos</h1>
          <p className="text-muted-foreground mt-2">
            Administra todos los cursos disponibles en la plataforma
          </p>
        </div>
      </div>
      
      <Suspense fallback={<CoursesLoadingSkeleton />}>
        <CoursesContainer />
      </Suspense>
    </div>
  )
}

export default CoursesAdminPage
