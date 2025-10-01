import { Suspense } from 'react'
import { JitsiMeeting } from '@/components/jitsi/JitsiMeeting'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { Loader2 } from 'lucide-react'

interface MeetingPageProps {
  params: Promise<{
    roomName: string
  }>
  searchParams: Promise<{
    bookingId?: string
  }>
}

async function MeetingContent({ params, searchParams }: MeetingPageProps) {
  const session = await auth()
  
  if (!session?.user?.id) {
    redirect('/signin')
  }

  const { roomName } = await params
  const { bookingId } = await searchParams

  // Verificar permisos si hay bookingId
  if (bookingId) {
    const booking = await db.classBooking.findUnique({
      where: { id: bookingId },
      select: {
        teacherId: true,
        studentId: true,
        status: true
      }
    })

    if (!booking) {
      redirect('/dashboard?error=booking-not-found')
    }

    // Verificar que el usuario sea parte de la reserva
    if (booking.teacherId !== session.user.id && booking.studentId !== session.user.id) {
      redirect('/dashboard?error=unauthorized')
    }

    // La reserva ya está confirmada, no necesitamos cambiar el estado
    // JaaS manejará el estado de la videollamada
  }

  return (
    <JitsiMeeting 
      roomName={roomName}
      bookingId={bookingId}
    />
  )
}

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-screen bg-gray-900">
      <div className="text-center text-white">
        <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin" />
        <h2 className="text-xl font-semibold mb-2">Cargando Videollamada</h2>
        <p className="text-gray-300">Preparando la sala de reunión...</p>
      </div>
    </div>
  )
}

export default function MeetingPage(props: MeetingPageProps) {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <MeetingContent {...props} />
    </Suspense>
  )
}

export const metadata = {
  title: 'Videollamada - Campus Lingowow',
  description: 'Sala de videollamada para clases en línea'
}
