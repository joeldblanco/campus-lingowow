import { Suspense } from 'react'
import { GradesContainer } from '@/components/admin/grades/grades-container'
import { GradesLoadingSkeleton } from '@/components/admin/grades/grades-loading-skeleton'

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
