import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ActivityForm } from '@/components/activities/activity-form'
import { getActivity } from '@/lib/actions/activity'

export const metadata: Metadata = {
  title: 'Editar Actividad | Lingowow',
  description: 'Editar actividad existente en el sistema',
}

interface EditActivityPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function EditActivityPage({ params }: EditActivityPageProps) {
  const { id } = await params
  const activity = await getActivity(id)

  // Si no se encuentra la actividad, mostrar página 404
  if (!activity) {
    notFound()
  }

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">Editar Actividad</h1>
      <ActivityForm activity={activity} />
    </div>
  )
}
