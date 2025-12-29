import { Metadata } from 'next'
import { ActivitiesDataTable } from '@/components/activities/datatable/data-table'
import { columns } from '@/components/activities/datatable/columns'
import { getActivities } from '@/lib/actions/activity'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Administración de Actividades | Lingowow',
  description: 'Gestiona las actividades del sistema',
}

export default async function ActivitiesAdminPage() {
  const activities = await getActivities()

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestión de Actividades</h1>
          <p className="text-muted-foreground">
            Administra todas las actividades educativas de la plataforma.
          </p>
        </div>
        <Link href="/admin/activities/create">
          <Button className="bg-primary hover:bg-primary/80 text-white">
            <Plus className="mr-2 h-4 w-4" />
            Nueva Actividad
          </Button>
        </Link>
      </div>
      <ActivitiesDataTable columns={columns} data={activities} />
    </div>
  )
}
