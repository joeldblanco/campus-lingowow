import { Suspense } from 'react'
import { GradesContainer } from '@/components/admin/grades/grades-container'
import { GradesLoadingSkeleton } from '@/components/admin/grades/grades-loading-skeleton'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Gestión de Calificaciones | Admin | Lingowow',
  description: 'Administra las calificaciones y notas de los estudiantes',
}

const GradesAdminPage = () => {
  return (
    <div className="space-y-6">
      <Suspense fallback={<GradesLoadingSkeleton />}>
        <GradesContainer />
      </Suspense>
    </div>
  )
}

export default GradesAdminPage
