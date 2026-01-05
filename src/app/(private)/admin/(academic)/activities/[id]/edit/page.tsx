import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getActivity } from '@/lib/actions/activity'
import { EditActivityClient } from './edit-activity-client'

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

  if (!activity) {
    notFound()
  }

  return <EditActivityClient activity={activity} />
}
