// /components/virtual-classroom/video-call.tsx
'use client'

import { Button } from '@/components/ui/button'
import { Mic, MicOff, PhoneOff, ScreenShare, Users, Video, VideoOff } from 'lucide-react'
import React, { useState } from 'react'

interface VideoCallProps {
  classId: string
  studentId: string
  teacherId: string
}

export const VideoCall: React.FC<VideoCallProps> = ({ classId, studentId, teacherId }) => {
  console.log(classId, studentId, teacherId)
  const [isMicOn, setIsMicOn] = useState(true)
  const [isVideoOn, setIsVideoOn] = useState(true)
  const [isScreenSharing, setIsScreenSharing] = useState(false)

  // Aquí irían las integraciones con la API de videollamadas
  // Puedes integrar directamente con Zoom SDK o usar otra solución como Twilio, Daily.co, etc.

  return (
    <div className="flex flex-col h-full border rounded-lg overflow-hidden">
      <div className="flex-grow bg-gray-900 relative">
        {/* Área principal de video */}
        <div className="h-full w-full flex items-center justify-center">
          {isVideoOn ? (
            <div className="w-full h-full bg-gray-800">
              {/* Aquí se renderizaría el video principal */}
              <div className="w-full h-full flex items-center justify-center text-white">
                Video del profesor
              </div>
            </div>
          ) : (
            <div className="text-white">Cámara apagada</div>
          )}
        </div>

        {/* Miniaturas de participantes */}
        <div className="absolute bottom-4 right-4 flex gap-2">
          <div className="h-24 w-32 bg-gray-700 rounded">{/* Miniatura del estudiante */}</div>
        </div>
      </div>

      <div className="p-3 bg-gray-100 flex justify-center gap-2">
        <Button
          variant={isMicOn ? 'default' : 'destructive'}
          size="sm"
          onClick={() => setIsMicOn(!isMicOn)}
        >
          {isMicOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
        </Button>

        <Button
          variant={isVideoOn ? 'default' : 'destructive'}
          size="sm"
          onClick={() => setIsVideoOn(!isVideoOn)}
        >
          {isVideoOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
        </Button>

        <Button
          variant={isScreenSharing ? 'destructive' : 'default'}
          size="sm"
          onClick={() => setIsScreenSharing(!isScreenSharing)}
        >
          <ScreenShare className="h-4 w-4" />
        </Button>

        <Button variant="default" size="sm">
          <Users className="h-4 w-4" />
        </Button>

        <Button variant="destructive" size="sm">
          <PhoneOff className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
