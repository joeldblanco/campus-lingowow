'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
  useRoomContext,
} from '@livekit/components-react'
import '@livekit/components-styles'
import { RoomEvent } from 'livekit-client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface LiveKitMeetingProps {
  roomName: string
  bookingId?: string
  onMeetingEnd?: () => void
  studentName?: string
}

function MeetingRoom({ onMeetingEnd }: { onMeetingEnd?: () => void }) {
  const room = useRoomContext()

  useEffect(() => {
    if (!room) return

    const handleDisconnected = () => {
      console.log('Desconectado de la sala')
      onMeetingEnd?.()
    }

    room.on(RoomEvent.Disconnected, handleDisconnected)

    return () => {
      room.off(RoomEvent.Disconnected, handleDisconnected)
    }
  }, [room, onMeetingEnd])

  // Attendance is marked by the classroom layout (StudentClassroomLayout /
  // TeacherClassroomLayout). LiveKitMeeting used to mark it again here,
  // which created duplicate records when both components were mounted.
  return (
    <div className="h-full w-full">
      <VideoConference />
      <RoomAudioRenderer />
    </div>
  )
}

export function LiveKitMeeting({
  roomName,
  bookingId,
  onMeetingEnd,
  studentName,
}: LiveKitMeetingProps) {
  const [token, setToken] = useState<string | null>(null)
  const [serverUrl, setServerUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const router = useRouter()

  const handleMeetingEnd = useCallback(() => {
    if (onMeetingEnd) {
      onMeetingEnd()
    } else {
      router.push('/dashboard')
    }
  }, [onMeetingEnd, router])

  useEffect(() => {
    if (!bookingId) {
      setError('Se requiere una reserva para esta videollamada')
      setIsLoading(false)
      return
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15_000)

    const fetchToken = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const response = await fetch('/api/livekit/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookingId }),
          signal: controller.signal,
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || 'Error obteniendo token')
        }

        const data = await response.json()
        setToken(data.token)
        setServerUrl(data.serverUrl)
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') {
          setError('Tiempo de espera agotado al conectar')
        } else {
          console.error('Error obteniendo token LiveKit:', err)
          setError(err instanceof Error ? err.message : 'Error desconocido')
        }
      } finally {
        clearTimeout(timeoutId)
        setIsLoading(false)
      }
    }

    fetchToken()
    return () => {
      controller.abort()
      clearTimeout(timeoutId)
    }
  }, [bookingId, roomName, attempt])

  const handleRetry = () => {
    setToken(null)
    setAttempt((n) => n + 1)
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center text-white max-w-md mx-auto p-6">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <h2 className="text-xl font-semibold mb-2">Error en la Videollamada</h2>
          <p className="text-gray-300 mb-4">{error}</p>
          <div className="space-x-4">
            <Button onClick={handleRetry} variant="default">
              Reintentar
            </Button>
            <Button onClick={() => router.push('/dashboard')} variant="outline">
              Volver al Dashboard
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (isLoading || !token || !serverUrl) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center text-white">
          <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin" />
          <h2 className="text-xl font-semibold mb-2">Iniciando Videollamada</h2>
          <p className="text-gray-300">Conectando con Campus Lingowow...</p>
          {studentName && (
            <Badge variant="secondary" className="mt-4">
              Aula de Clases - {studentName}
            </Badge>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen w-full bg-gray-900">
      <LiveKitRoom
        token={token}
        serverUrl={serverUrl}
        connect={true}
        video={true}
        audio={true}
        onDisconnected={handleMeetingEnd}
        data-lk-theme="default"
        style={{ height: '100%', width: '100%' }}
      >
        <MeetingRoom onMeetingEnd={handleMeetingEnd} />
      </LiveKitRoom>
    </div>
  )
}
