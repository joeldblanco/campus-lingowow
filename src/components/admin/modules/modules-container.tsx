'use client'

import { useState, useEffect } from 'react'
import { getAllModules, getModuleStats } from '@/lib/actions/modules'
import { ModuleWithDetails, ModuleStats } from '@/types/module'
import { ModulesTable } from './modules-table'
import { ModulesStats } from './modules-stats'
import { CreateModuleDialog } from './create-module-dialog'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { ModulesLoadingSkeleton } from './modules-loading-skeleton'

export function ModulesContainer() {
  const [modules, setModules] = useState<ModuleWithDetails[]>([])
  const [stats, setStats] = useState<ModuleStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadData = async () => {
    try {
      setIsLoading(true)
      const [modulesData, statsData] = await Promise.all([getAllModules(), getModuleStats()])
      setModules(modulesData)
      setStats(statsData)
    } catch (error) {
      console.error('Error loading modules data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  if (isLoading) {
    return <ModulesLoadingSkeleton />
  }

  return (
    <div className="space-y-6">
      {stats && <ModulesStats stats={stats} />}

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Lista de Módulos</h2>
        <CreateModuleDialog onModuleCreated={loadData}>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Crear Módulo
          </Button>
        </CreateModuleDialog>
      </div>

      <ModulesTable modules={modules} onModuleUpdated={loadData} />
    </div>
  )
}
