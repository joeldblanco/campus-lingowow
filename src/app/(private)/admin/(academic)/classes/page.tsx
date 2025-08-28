import { Suspense } from 'react'
import { ClassesContainer } from '@/components/admin/classes/classes-container'
import { ClassesLoadingSkeleton } from '@/components/admin/classes/classes-loading-skeleton'

const ClassesAdminPage = () => {
  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Clases</h1>
          <p className="text-muted-foreground mt-2">
            Administra todas las clases programadas, pasadas y futuras
          </p>
        </div>
      </div>
      
      <Suspense fallback={<ClassesLoadingSkeleton />}>
        <ClassesContainer />
      </Suspense>
    </div>
  )
}

export default ClassesAdminPage
