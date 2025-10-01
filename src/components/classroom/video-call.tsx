// /components/classroom/video-call.tsx
'use client'

import React, { useState } from 'react'
import { JitsiMeeting } from '@/components/jitsi/JitsiMeeting'
import { JitsiButton } from '@/components/jitsi/JitsiButton'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Video, 
  Users,
  ExternalLink
} from 'lucide-react'
import { createJitsiMeeting } from '@/lib/actions/jitsi'
import { toast } from 'sonner'

interface VideoCallProps {
  bookingId?: string
}

export const VideoCall: React.FC<VideoCallProps> = ({ 
  bookingId 
}) => {
  const [isInMeeting, setIsInMeeting] = useState(false)
  const [roomName, setRoomName] = useState<string | null>(null)
  const [isInitializing, setIsInitializing] = useState(false)

  // Initialize video call room
  const handleStartCall = async () => {
    if (!bookingId) {
      toast.error('Se requiere una reserva de clase para iniciar la videollamada')
      return
    }

    setIsInitializing(true)
    try {
      const result = await createJitsiMeeting(bookingId)
      if (result.success && result.roomName) {
        setRoomName(result.roomName)
        setIsInMeeting(true)
        toast.success('Videollamada iniciada')
      } else {
        toast.error(result.error || 'Error al crear la videollamada')
      }
    } catch (error) {
      console.error('Error initializing video call:', error)
      toast.error('Error al inicializar la videollamada')
    } finally {
      setIsInitializing(false)
    }
  }

  const handleJoinExternalMeeting = () => {
    if (roomName && bookingId) {
      // Abrir en nueva ventana para mejor experiencia
      const meetingUrl = `/meeting/${roomName}?bookingId=${bookingId}`
      window.open(meetingUrl, '_blank', 'width=1200,height=800')
    }
  }

  const handleEndMeeting = () => {
    setIsInMeeting(false)
    setRoomName(null)
    toast.success('Videollamada finalizada')
  }

  // Si está en reunión y tenemos roomName, mostrar Jitsi embebido
  if (isInMeeting && roomName && bookingId) {
    return (
      <div className="flex flex-col h-full border rounded-lg overflow-hidden">
        {/* Header con opción de abrir en nueva ventana */}
        <div className="p-2 bg-gray-100 border-b flex items-center justify-between">
          <Badge variant="outline" className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            Videollamada Activa
          </Badge>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleJoinExternalMeeting}
              className="flex items-center gap-1"
            >
              <ExternalLink className="h-3 w-3" />
              Abrir en Nueva Ventana
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleEndMeeting}
            >
              Finalizar
            </Button>
          </div>
        </div>

        {/* Jitsi Meeting embebido */}
        <div className="flex-grow">
          <JitsiMeeting
            roomName={roomName}
            bookingId={bookingId}
            onMeetingEnd={handleEndMeeting}
          />
        </div>
      </div>
    )
  }

  // Estado inicial - mostrar controles para iniciar
  return (
    <div className="flex flex-col h-full border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="p-2 bg-gray-100 border-b flex items-center justify-between">
        <Badge variant="outline" className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-gray-400"></div>
          Videollamada No Iniciada
        </Badge>
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-gray-500" />
          <span className="text-sm text-gray-600">Esperando inicio</span>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-grow bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white max-w-md mx-auto p-6">
          <Video className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-semibold mb-2">Videollamada de Clase</h3>
          <p className="text-gray-300 mb-6">
            {bookingId 
              ? 'Inicia la videollamada para comenzar la clase virtual'
              : 'Se requiere una reserva de clase para iniciar la videollamada'
            }
          </p>
          
          {bookingId ? (
            <div className="space-y-3">
              {/* Botón principal para iniciar */}
              <Button
                onClick={handleStartCall}
                disabled={isInitializing}
                className="w-full"
                size="lg"
              >
                {isInitializing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Iniciando...
                  </>
                ) : (
                  <>
                    <Video className="h-4 w-4 mr-2" />
                    Iniciar Videollamada
                  </>
                )}
              </Button>

              {/* Botón alternativo usando JitsiButton */}
              <div className="text-xs text-gray-400 mb-2">o</div>
              <JitsiButton 
                bookingId={bookingId}
                variant="outline"
                className="w-full"
                size="lg"
              >
                Abrir en Nueva Ventana
              </JitsiButton>
            </div>
          ) : (
            <Button
              disabled
              variant="outline"
              className="w-full"
              size="lg"
            >
              Reserva de Clase Requerida
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
