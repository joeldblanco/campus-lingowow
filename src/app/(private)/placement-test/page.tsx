'use server'

import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { getPlacementTests } from '@/lib/actions/exams'
import { PlacementTestList } from '@/components/placement-test/placement-test-list'

export default async function PlacementTestPage() {
  const session = await auth()
  
  if (!session?.user?.id) {
    redirect('/auth/signin')
  }

  const placementTests = await getPlacementTests(session.user.id)

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Test de Clasificación</h1>
          <p className="text-muted-foreground mt-2">
            Descubre tu nivel de idioma con nuestros tests de clasificación. 
            El resultado te ayudará a elegir el curso más adecuado para ti.
          </p>
        </div>

        <PlacementTestList tests={placementTests} userId={session.user.id} />
      </div>
    </div>
  )
}
