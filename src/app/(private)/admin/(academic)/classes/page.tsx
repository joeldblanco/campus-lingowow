import { Suspense } from 'react'
import { ClassesContainer } from '@/components/admin/classes/classes-container'
import { ClassesLoadingSkeleton } from '@/components/admin/classes/classes-loading-skeleton'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Gestión de Clases | Admin | Lingowow',
  description: 'Administra todas las clases programadas, pasadas y futuras',
}

const ClassesAdminPage = () => {
  return (
    <div className="space-y-6">
      <Suspense fallback={<ClassesLoadingSkeleton />}>
        <ClassesContainer />
      </Suspense>
    </div>
  )
}

export default ClassesAdminPage
