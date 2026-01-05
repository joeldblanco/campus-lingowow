import { Suspense } from 'react'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { RecordingsLibrary } from '@/components/recordings/recordings-library'
import { Metadata } from 'next'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

export const metadata: Metadata = {
  title: 'Grabaciones | Lingowow',
  description: 'Accede a las grabaciones de tus clases pasadas',
}

export default async function RecordingsPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/auth/signin')
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Suspense fallback={<LoadingSpinner />}>
        <RecordingsLibrary />
      </Suspense>
    </div>
  )
}
