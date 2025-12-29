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
    <div className="space-y-6">
      <Suspense fallback={<EnrollmentsLoadingSkeleton />}>
        <EnrollmentsContainer />
      </Suspense>
    </div>
  )
}

export default EnrollmentsAdminPage
