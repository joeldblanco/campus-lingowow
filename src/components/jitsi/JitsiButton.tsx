'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Video, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { generateRoomName } from '@/lib/jitsi-jwt'

interface JitsiButtonProps {
  bookingId: string
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
  children?: React.ReactNode
}

export function JitsiButton({ 
  bookingId, 
  variant = 'default', 
  size = 'default',
  className = '',
  children 
}: JitsiButtonProps) {
  const [isStarting, setIsStarting] = useState(false)
  const router = useRouter()

  const handleStartMeeting = async () => {
    try {
      setIsStarting(true)
      
      // Generar nombre de sala único
      const roomName = generateRoomName(bookingId)
      
      // Redirigir a la página de reunión
      router.push(`/meeting/${roomName}?bookingId=${bookingId}`)
      
    } catch (error) {
      console.error('Error iniciando videollamada:', error)
      setIsStarting(false)
    }
  }

  return (
    <Button
      onClick={handleStartMeeting}
      disabled={isStarting}
      variant={variant}
      size={size}
      className={className}
    >
      {isStarting ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Iniciando...
        </>
      ) : (
        <>
          <Video className="w-4 h-4 mr-2" />
          {children || 'Iniciar Videollamada'}
        </>
      )}
    </Button>
  )
}
