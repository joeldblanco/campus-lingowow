import { Suspense } from 'react'
import { GradesContainer } from '@/components/admin/grades/grades-container'
import { GradesLoadingSkeleton } from '@/components/admin/grades/grades-loading-skeleton'

const GradesAdminPage = () => {
  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Calificaciones</h1>
          <p className="text-muted-foreground mt-2">
            Administra y visualiza las calificaciones de todos los estudiantes
          </p>
        </div>
      </div>
      
      <Suspense fallback={<GradesLoadingSkeleton />}>
        <GradesContainer />
      </Suspense>
    </div>
  )
}

export default GradesAdminPage
