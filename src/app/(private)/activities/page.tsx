import { Metadata } from 'next'
import ActivitiesContainer from '@/components/activities/activities-container'

export const metadata: Metadata = {
  title: 'Actividades | Lingowow',
  description: 'Sistema de actividades gamificadas para aprender idiomas',
}

export default function ActivitiesPage() {
  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">Actividades</h1>
      <ActivitiesContainer />
    </div>
  )
}
