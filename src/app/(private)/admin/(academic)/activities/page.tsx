import { Metadata } from 'next'
import { ActivitiesDataTable } from '@/components/activities/datatable/data-table'
import { columns } from '@/components/activities/datatable/columns'
import { getActivities } from '@/lib/actions/activity'

export const metadata: Metadata = {
  title: 'Administración de Actividades | Lingowow',
  description: 'Gestiona las actividades del sistema',
}

export default async function ActivitiesAdminPage() {
  // Obtener actividades de la base de datos
  const activities = await getActivities()

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">Administración de Actividades</h1>
      <ActivitiesDataTable columns={columns} data={activities} />
    </div>
  )
}
