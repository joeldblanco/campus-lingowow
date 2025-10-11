import { Suspense } from 'react'
import { EnrollmentsContainer } from '@/components/admin/enrollments/enrollments-container'
import { EnrollmentsLoadingSkeleton } from '@/components/admin/enrollments/enrollments-loading-skeleton'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Gestión de Inscripciones | Admin | Lingowow',
  description: 'Administra las inscripciones de estudiantes en los cursos',
}

const EnrollmentsAdminPage = () => {
  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Inscripciones</h1>
          <p className="text-muted-foreground mt-2">
            Administra las inscripciones de estudiantes en los cursos
          </p>
        </div>
      </div>
      
      <Suspense fallback={<EnrollmentsLoadingSkeleton />}>
        <EnrollmentsContainer />
      </Suspense>
    </div>
  )
}

export default EnrollmentsAdminPage
