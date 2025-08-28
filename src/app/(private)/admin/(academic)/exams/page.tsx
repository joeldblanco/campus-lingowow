import { Suspense } from 'react'
import { ExamsContainer } from '@/components/admin/exams/exams-container'
import { ExamsLoadingSkeleton } from '@/components/admin/exams/exams-loading-skeleton'

export default function ExamsAdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Exámenes</h1>
        <p className="text-muted-foreground">
          Aquí se encuentra toda la información sobre los exámenes disponibles en Lingowow.
        </p>
      </div>
      
      <Suspense fallback={<ExamsLoadingSkeleton />}>
        <ExamsContainer />
      </Suspense>
    </div>
  )
}
