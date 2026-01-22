'use client'

import { ResourceBuilder } from '@/components/admin/resource-builder'
import { useAutoCloseSidebar } from '@/hooks/use-auto-close-sidebar'

export default function NewResourcePage() {
  useAutoCloseSidebar()
  return (
    <div className="h-[calc(100vh-4rem)]">
      <ResourceBuilder />
    </div>
  )
}
