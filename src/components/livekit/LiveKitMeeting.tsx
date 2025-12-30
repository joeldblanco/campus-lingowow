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

function MeetingRoom({ 
  bookingId, 
  onMeetingEnd, 
  isModerator 
}: { 
  bookingId?: string
  onMeetingEnd?: () => void
  isModerator: boolean
}) {
  const room = useRoomContext()
  const [hasMarkedAttendance, setHasMarkedAttendance] = useState(false)

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

  useEffect(() => {
    const markAttendance = async () => {
      if (!bookingId || hasMarkedAttendance) return

      try {
        const userType = isModerator ? 'teacher' : 'student'
        const response = await fetch('/api/attendance/mark', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            bookingId, 
            userType 
          }),
        })
        
        const data = await response.json()
        if (data.success) {
          console.log(`Asistencia marcada: ${userType}`)
          setHasMarkedAttendance(true)
        } else {
          console.error('Error marcando asistencia:', data.error)
        }
      } catch (error) {
        console.error('Error al marcar asistencia:', error)
      }
    }

    markAttendance()
  }, [bookingId, isModerator, hasMarkedAttendance])

  return (
    <div className="h-full w-full">
      <VideoConference />
      <RoomAudioRenderer />
    </div>
  )
}

export function LiveKitMeeting({ roomName, bookingId, onMeetingEnd, studentName }: LiveKitMeetingProps) {
  const [token, setToken] = useState<string | null>(null)
  const [serverUrl, setServerUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isModerator, setIsModerator] = useState(false)
  const router = useRouter()

  const handleMeetingEnd = useCallback(() => {
    if (onMeetingEnd) {
      onMeetingEnd()
    } else {
      router.push('/dashboard')
    }
  }, [onMeetingEnd, router])

  useEffect(() => {
    const fetchToken = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const response = await fetch('/api/livekit/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ roomName, bookingId }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Error obteniendo token')
        }

        const data = await response.json()
        setToken(data.token)
        setServerUrl(data.serverUrl)
        setIsModerator(data.user?.isModerator || false)
      } catch (error) {
        console.error('Error obteniendo token LiveKit:', error)
        setError(error instanceof Error ? error.message : 'Error desconocido')
      } finally {
        setIsLoading(false)
      }
    }

    fetchToken()
  }, [roomName, bookingId])

  const handleRetry = () => {
    setError(null)
    setToken(null)
    setIsLoading(true)
    
    const fetchToken = async () => {
      try {
        const response = await fetch('/api/livekit/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ roomName, bookingId }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Error obteniendo token')
        }

        const data = await response.json()
        setToken(data.token)
        setServerUrl(data.serverUrl)
        setIsModerator(data.user?.isModerator || false)
      } catch (error) {
        console.error('Error obteniendo token LiveKit:', error)
        setError(error instanceof Error ? error.message : 'Error desconocido')
      } finally {
        setIsLoading(false)
      }
    }

    fetchToken()
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
            <Button 
              onClick={() => router.push('/dashboard')} 
              variant="outline"
            >
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
        <MeetingRoom 
          bookingId={bookingId}
          onMeetingEnd={handleMeetingEnd}
          isModerator={isModerator}
        />
      </LiveKitRoom>
    </div>
  )
}
