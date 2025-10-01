import { Suspense } from 'react'
import { LessonsContainer } from '@/components/admin/lessons/lessons-container'
import { LessonsLoadingSkeleton } from '@/components/admin/lessons/lessons-loading-skeleton'

export default function LessonsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Gestión de Lecciones
        </h1>
        <p className="text-gray-600">
          Administra las lecciones del sistema educativo
        </p>
      </div>

      <Suspense fallback={<LessonsLoadingSkeleton />}>
        <LessonsContainer />
      </Suspense>
    </div>
  )
}
