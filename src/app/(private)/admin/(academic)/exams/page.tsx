import { Suspense } from 'react'
import { ExamsContainer } from '@/components/admin/exams/exams-container'
import { ExamsLoadingSkeleton } from '@/components/admin/exams/exams-loading-skeleton'

export default function ExamsAdminPage() {
  return (
    <div className="space-y-6">
      <Suspense fallback={<ExamsLoadingSkeleton />}>
        <ExamsContainer />
      </Suspense>
    </div>
  )
}
