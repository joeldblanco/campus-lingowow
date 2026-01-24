'use client'

import { useState, useEffect } from 'react'
import { ActivitiesDataTable } from '@/components/activities/datatable/data-table'
import { createColumns } from '@/components/activities/datatable/columns'
import { getActivities } from '@/lib/actions/activity'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { CreateActivityModal } from '@/components/admin/activities/create-activity-modal'
import { Activity } from '@prisma/client'

export default function ActivitiesAdminPage() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    loadActivities()
  }, [])

  const loadActivities = async () => {
    try {
      const data = await getActivities()
      setActivities(data)
    } catch (error) {
      console.error('Error loading activities:', error)
    }
  }

  // Crear las columnas con la función de actualización
  const columns = createColumns(loadActivities)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestión de Actividades</h1>
          <p className="text-muted-foreground">
            Administra todas las actividades educativas de la plataforma.
          </p>
        </div>
        <Button 
          onClick={() => setIsModalOpen(true)}
          className="bg-primary hover:bg-primary/80 text-white"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nueva Actividad
        </Button>
      </div>
      
      <ActivitiesDataTable columns={columns} data={activities} />
      
      <CreateActivityModal 
        open={isModalOpen} 
        onOpenChange={setIsModalOpen}
      />
    </div>
  )
}
