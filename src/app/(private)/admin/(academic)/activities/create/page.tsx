import { Metadata } from 'next'
import { ActivityForm } from '@/components/activities/activity-form'

export const metadata: Metadata = {
  title: 'Crear Nueva Actividad | Lingowow',
  description: 'Crear una nueva actividad en el sistema',
}

export default function CreateActivityPage() {
  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">Crear Nueva Actividad</h1>
      <ActivityForm />
    </div>
  )
}
