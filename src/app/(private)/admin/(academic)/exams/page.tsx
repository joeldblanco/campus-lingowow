import { Suspense } from 'react'
import { ExamsContainer } from '@/components/admin/exams/exams-container'
import { ExamsLoadingSkeleton } from '@/components/admin/exams/exams-loading-skeleton'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Gestión de Exámenes | Admin | Lingowow',
  description: 'Administra los exámenes y evaluaciones de la plataforma',
}

export default function ExamsAdminPage() {
  return (
    <div className="space-y-6">
      <Suspense fallback={<ExamsLoadingSkeleton />}>
        <ExamsContainer />
      </Suspense>
    </div>
  )
}
