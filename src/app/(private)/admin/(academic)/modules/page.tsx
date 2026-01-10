import { Suspense } from 'react'
import { ModulesContainer } from '@/components/admin/modules/modules-container'
import { ModulesLoadingSkeleton } from '@/components/admin/modules/modules-loading-skeleton'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Gestión de Módulos | Admin | Lingowow',
  description: 'Administra los módulos del sistema educativo',
}

export default function ModulesPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestión de Módulos</h1>
        <p className="text-gray-600">Administra los módulos del sistema educativo</p>
      </div>

      <Suspense fallback={<ModulesLoadingSkeleton />}>
        <ModulesContainer />
      </Suspense>
    </div>
  )
}
