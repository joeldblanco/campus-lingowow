'use client'

import { use, useCallback, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TestVideoCall } from '@/components/jitsi/TestVideoCall'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface VideoTestRoomPageProps {
  params: Promise<{ roomCode: string }>
}

export default function VideoTestRoomPage({ params }: VideoTestRoomPageProps) {
  const { roomCode } = use(params)
  const [hasEnded, setHasEnded] = useState(false)

  const handleMeetingEnd = useCallback(() => {
    setHasEnded(true)
  }, [])

  if (hasEnded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center text-white max-w-md mx-auto p-6">
          <h2 className="text-2xl font-bold mb-4">Videollamada Finalizada</h2>
          <p className="text-gray-300 mb-6">
            La sesión de prueba ha terminado.
          </p>
          <Link href="/dashboard">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver al Dashboard
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col">
      <div className="p-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="bg-white/20 text-white">
            <div className="w-2 h-2 rounded-full bg-green-400 mr-2 animate-pulse"></div>
            Modo Prueba
          </Badge>
          <span className="text-sm font-medium">Sala: {roomCode}</span>
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={handleMeetingEnd}
        >
          Finalizar Prueba
        </Button>
      </div>
      <div className="flex-1">
        <TestVideoCall
          roomName={roomCode}
          onMeetingEnd={handleMeetingEnd}
        />
      </div>
    </div>
  )
}
