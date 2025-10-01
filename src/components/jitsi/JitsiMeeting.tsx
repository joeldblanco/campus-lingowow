'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface JitsiMeetingProps {
  roomName: string
  bookingId?: string
  onMeetingEnd?: () => void
}


declare global {
  interface Window {
    JitsiMeetExternalAPI: new (domain: string, options: JitsiOptions) => JitsiAPI
  }
}

interface JitsiOptions {
  roomName: string
  jwt: string
  parentNode: HTMLElement | null
  width: string
  height: string
  lang: string
  configOverwrite: Record<string, unknown>
  interfaceConfigOverwrite: Record<string, unknown>
  onload: () => void
}

interface JitsiAPI {
  addEventListener: (event: string, callback: (data?: unknown) => void) => void
  dispose: () => void
}

export function JitsiMeeting({ roomName, bookingId, onMeetingEnd }: JitsiMeetingProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const apiRef = useRef<JitsiAPI | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isScriptLoaded, setIsScriptLoaded] = useState(false)
  const router = useRouter()

  // Cargar script de JaaS
  useEffect(() => {
    const appId = process.env.NEXT_PUBLIC_JAAS_APP_ID
    if (!appId) {
      setError('Configuración de JaaS no encontrada')
      setIsLoading(false)
      return
    }

    const script = document.createElement('script')
    script.src = `https://8x8.vc/${appId}/external_api.js`
    script.async = true
    script.onload = () => setIsScriptLoaded(true)
    script.onerror = () => {
      setError('Error cargando JaaS')
      setIsLoading(false)
    }
    
    document.head.appendChild(script)

    return () => {
      document.head.removeChild(script)
    }
  }, [])

  // Inicializar Jitsi cuando el script esté cargado
  useEffect(() => {
    if (!isScriptLoaded || !containerRef.current) return

    const initializeJitsi = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Obtener token JWT
        const response = await fetch('/api/jitsi/token', {
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

        const { token, user } = await response.json()

        // Configurar opciones de Jitsi
        const options: JitsiOptions = {
          roomName: `${process.env.NEXT_PUBLIC_JAAS_APP_ID}/${roomName}`,
          jwt: token,
          parentNode: containerRef.current,
          width: '100%',
          height: '100%',
          lang: 'es',
          configOverwrite: {
            startWithAudioMuted: false,
            startWithVideoMuted: false,
            enableWelcomePage: false,
            prejoinPageEnabled: false,
            disableModeratorIndicator: false,
            startScreenSharing: false,
            enableEmailInStats: false,
            enableDisplayNameInStats: false,
            enablePhoneNumberInStats: false,
            requireDisplayName: false,
            notifications: [],
            recordingService: {
              enabled: user.isModerator,
              sharingEnabled: user.isModerator
            }
          },
          interfaceConfigOverwrite: {
            TOOLBAR_BUTTONS: [
              'microphone', 'camera', 'closedcaptions', 'desktop', 
              'fullscreen', 'fodeviceselection', 'hangup', 'profile',
              'chat', 'recording', 'livestreaming', 'etherpad', 'sharedvideo',
              'settings', 'raisehand', 'videoquality', 'filmstrip',
              'invite', 'feedback', 'stats', 'shortcuts', 'tileview',
              'videobackgroundblur', 'download', 'help', 'mute-everyone'
            ],
            SETTINGS_SECTIONS: ['devices', 'language', 'moderator', 'profile', 'calendar'],
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            SHOW_BRAND_WATERMARK: false,
            BRAND_WATERMARK_LINK: '',
            SHOW_POWERED_BY: false,
            SHOW_PROMOTIONAL_CLOSE_PAGE: false,
            SHOW_CHROME_EXTENSION_BANNER: false,
            MOBILE_APP_PROMO: false,
            NATIVE_APP_NAME: 'Campus Lingowow',
            PROVIDER_NAME: 'Campus Lingowow',
            LANG_DETECTION: true,
            CONNECTION_INDICATOR_AUTO_HIDE_ENABLED: true,
            CONNECTION_INDICATOR_AUTO_HIDE_TIMEOUT: 5000,
            CONNECTION_INDICATOR_DISABLED: false,
            VIDEO_LAYOUT_FIT: 'both',
            FILM_STRIP_MAX_HEIGHT: 120,
            TILE_VIEW_MAX_COLUMNS: 5,
            DEFAULT_BACKGROUND: '#1f2937',
            DISABLE_VIDEO_BACKGROUND: false,
            INITIAL_TOOLBAR_TIMEOUT: 20000,
            TOOLBAR_TIMEOUT: 4000,
            TOOLBAR_ALWAYS_VISIBLE: false,
            DISPLAY_WELCOME_PAGE_CONTENT: false,
            DISPLAY_WELCOME_PAGE_TOOLBAR_ADDITIONAL_CONTENT: false,
            APP_NAME: 'Campus Lingowow',
            CLOSE_PAGE_GUEST_HINT: false,
            DISABLE_JOIN_LEAVE_NOTIFICATIONS: false,
            DISABLE_PRESENCE_STATUS: false,
            DISABLE_RINGING: false,
            AUDIO_LEVEL_PRIMARY_COLOR: 'rgba(255,255,255,0.4)',
            AUDIO_LEVEL_SECONDARY_COLOR: 'rgba(255,255,255,0.2)',
            POLICY_LOGO: null,
            LOCAL_THUMBNAIL_RATIO: 16 / 9,
            REMOTE_THUMBNAIL_RATIO: 1,
            LIVE_STREAMING_HELP_LINK: 'https://jitsi.org/live',
            MOBILE_DOWNLOAD_LINK_ANDROID: 'https://play.google.com/store/apps/details?id=org.jitsi.meet',
            MOBILE_DOWNLOAD_LINK_F_DROID: 'https://f-droid.org/en/packages/org.jitsi.meet/',
            MOBILE_DOWNLOAD_LINK_IOS: 'https://itunes.apple.com/us/app/jitsi-meet/id1165103905'
          },
          onload: () => {
            setIsLoading(false)
          }
        }

        // Crear instancia de JitsiMeetExternalAPI
        apiRef.current = new window.JitsiMeetExternalAPI('8x8.vc', options)

        // Event listeners
        apiRef.current.addEventListener('readyToClose', () => {
          if (onMeetingEnd) {
            onMeetingEnd()
          } else {
            router.push('/dashboard')
          }
        })

        apiRef.current.addEventListener('participantLeft', (participant: unknown) => {
          console.log('Participante salió:', participant)
        })

        apiRef.current.addEventListener('participantJoined', (participant: unknown) => {
          console.log('Participante se unió:', participant)
        })

        apiRef.current.addEventListener('videoConferenceJoined', (participant: unknown) => {
          console.log('Te uniste a la conferencia:', participant)
          setIsLoading(false)
        })

        apiRef.current.addEventListener('videoConferenceLeft', () => {
          console.log('Saliste de la conferencia')
          if (onMeetingEnd) {
            onMeetingEnd()
          } else {
            router.push('/dashboard')
          }
        })

        apiRef.current.addEventListener('recordingStatusChanged', (status: unknown) => {
          console.log('Estado de grabación:', status)
        })

      } catch (error) {
        console.error('Error inicializando Jitsi:', error)
        setError(error instanceof Error ? error.message : 'Error desconocido')
        setIsLoading(false)
      }
    }

    initializeJitsi()

    return () => {
      if (apiRef.current) {
        apiRef.current.dispose()
        apiRef.current = null
      }
    }
  }, [isScriptLoaded, roomName, bookingId, onMeetingEnd, router])


  const handleRetry = () => {
    setError(null)
    setIsScriptLoaded(false)
    // Recargar el script
    const appId = process.env.NEXT_PUBLIC_JAAS_APP_ID
    if (appId) {
      const script = document.createElement('script')
      script.src = `https://8x8.vc/${appId}/external_api.js`
      script.async = true
      script.onload = () => setIsScriptLoaded(true)
      document.head.appendChild(script)
    }
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

  return (
    <div className="relative w-full h-screen bg-gray-900">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
          <div className="text-center text-white">
            <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin" />
            <h2 className="text-xl font-semibold mb-2">Iniciando Videollamada</h2>
            <p className="text-gray-300">Conectando con Campus Lingowow...</p>
            <Badge variant="secondary" className="mt-4">
              Sala: {roomName}
            </Badge>
          </div>
        </div>
      )}
      
      <div 
        ref={containerRef} 
        className="w-full h-full"
        style={{ minHeight: '100vh' }}
      />
    </div>
  )
}
