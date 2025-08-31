'use client'

import { useState, useEffect } from 'react'
import { getAllModules, getModuleStats } from '@/lib/actions/modules'
import { ModuleWithDetails, ModuleStats } from '@/types/module'
import { UnitsTable } from './units-table'
import { UnitsStats } from './units-stats'
import { CreateUnitDialog } from './create-unit-dialog'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { UnitsLoadingSkeleton } from './units-loading-skeleton'

export function UnitsContainer() {
  const [units, setUnits] = useState<ModuleWithDetails[]>([])
  const [stats, setStats] = useState<ModuleStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadData = async () => {
    try {
      setIsLoading(true)
      const [unitsData, statsData] = await Promise.all([
        getAllModules(),
        getModuleStats(),
      ])
      setUnits(unitsData)
      setStats(statsData)
    } catch (error) {
      console.error('Error loading units data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  if (isLoading) {
    return <UnitsLoadingSkeleton />
  }

  return (
    <div className="space-y-6">
      {stats && <UnitsStats stats={stats} />}
      
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Lista de Unidades</h2>
        <CreateUnitDialog onUnitCreated={loadData}>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Crear Unidad
          </Button>
        </CreateUnitDialog>
      </div>

      <UnitsTable units={units} onUnitUpdated={loadData} />
    </div>
  )
}
