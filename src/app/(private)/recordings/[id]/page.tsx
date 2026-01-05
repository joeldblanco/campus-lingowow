import { Suspense } from 'react'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { RecordingViewer } from '@/components/recordings/recording-viewer'
import { Metadata } from 'next'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

export const metadata: Metadata = {
  title: 'Ver Grabación | Lingowow',
  description: 'Reproduce la grabación de tu clase',
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function RecordingPage({ params }: PageProps) {
  const session = await auth()
  const { id } = await params

  if (!session?.user?.id) {
    redirect('/auth/signin')
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Suspense fallback={<LoadingSpinner />}>
        <RecordingViewer recordingId={id} />
      </Suspense>
    </div>
  )
}
