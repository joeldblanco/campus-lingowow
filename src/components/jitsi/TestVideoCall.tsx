'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, AlertCircle } from 'lucide-react'

interface TestVideoCallProps {
  roomName: string
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
  executeCommand: (command: string, ...args: unknown[]) => void
  getParticipantsInfo: () => unknown[]
}

export function TestVideoCall({ roomName, onMeetingEnd }: TestVideoCallProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const apiRef = useRef<JitsiAPI | null>(null)
  const isInitializedRef = useRef(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isScriptLoaded, setIsScriptLoaded] = useState(false)

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
      if (document.head.contains(script)) {
        document.head.removeChild(script)
      }
    }
  }, [])

  const handleMeetingEnd = useCallback(() => {
    if (onMeetingEnd) {
      onMeetingEnd()
    }
  }, [onMeetingEnd])

  useEffect(() => {
    if (!isScriptLoaded || !containerRef.current || isInitializedRef.current) return

    const initializeJitsi = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const response = await fetch('/api/jitsi/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ roomName }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Error obteniendo token')
        }

        const { token, user } = await response.json()

        if (!containerRef.current) {
          console.warn('Container ref is null after token fetch')
          return
        }

        const moderatorButtons = [
          'microphone', 'camera', 'closedcaptions', 'desktop', 
          'fullscreen', 'fodeviceselection', 'hangup', 'profile',
          'recording', 'livestreaming', 'etherpad', 'sharedvideo',
          'settings', 'raisehand', 'videoquality', 'filmstrip',
          'invite', 'feedback', 'stats', 'shortcuts', 'tileview',
          'videobackgroundblur', 'download', 'help', 'mute-everyone',
          'security'
        ]

        const participantButtons = [
          'microphone', 'camera', 'closedcaptions', 'desktop',
          'fullscreen', 'fodeviceselection', 'hangup', 'profile',
          'settings', 'raisehand', 'videoquality', 'filmstrip',
          'tileview', 'videobackgroundblur'
        ]

        const moderatorSettings = ['devices', 'language', 'moderator', 'profile', 'calendar']
        const participantSettings = ['devices', 'language', 'profile']

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
            fileRecordingsEnabled: true,
            fileRecordingsServiceEnabled: true,
            fileRecordingsServiceSharingEnabled: false,
            hiddenDomain: 'recorder.8x8.vc',
            recordingService: {
              enabled: true,
              sharingEnabled: false,
              hideStorageWarning: true
            },
            screenshotCapture: {
              enabled: false
            },
            disableRemoteMute: !user.isModerator,
            startSilent: false,
            enableLobbyChat: false,
            enableInsecureRoomNameWarning: false,
            disableChat: true,
            desktopSharingFrameRate: {
              min: 5,
              max: 30
            }
          },
          interfaceConfigOverwrite: {
            TOOLBAR_BUTTONS: user.isModerator ? moderatorButtons : participantButtons,
            SETTINGS_SECTIONS: user.isModerator ? moderatorSettings : participantSettings,
            DISABLE_CHAT: true,
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            SHOW_BRAND_WATERMARK: false,
            BRAND_WATERMARK_LINK: '',
            SHOW_POWERED_BY: false,
            SHOW_PROMOTIONAL_CLOSE_PAGE: false,
            SHOW_CHROME_EXTENSION_BANNER: false,
            MOBILE_APP_PROMO: false,
            NATIVE_APP_NAME: 'Campus Lingowow - Test',
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
            APP_NAME: 'Campus Lingowow - Prueba',
            CLOSE_PAGE_GUEST_HINT: false,
            DISABLE_JOIN_LEAVE_NOTIFICATIONS: false,
            DISABLE_PRESENCE_STATUS: false,
            DISABLE_RINGING: false,
            AUDIO_LEVEL_PRIMARY_COLOR: 'rgba(255,255,255,0.4)',
            AUDIO_LEVEL_SECONDARY_COLOR: 'rgba(255,255,255,0.2)',
            POLICY_LOGO: null,
            LOCAL_THUMBNAIL_RATIO: 16 / 9,
            REMOTE_THUMBNAIL_RATIO: 1
          },
          onload: () => {
            setIsLoading(false)
          }
        }

        apiRef.current = new window.JitsiMeetExternalAPI('8x8.vc', options)
        isInitializedRef.current = true

        apiRef.current.addEventListener('readyToClose', () => {
          handleMeetingEnd()
        })

        apiRef.current.addEventListener('participantLeft', (participant: unknown) => {
          console.log('[Test] Participante salió:', participant)
        })

        apiRef.current.addEventListener('participantJoined', (participant: unknown) => {
          console.log('[Test] Participante se unió:', participant)
        })

        apiRef.current.addEventListener('videoConferenceJoined', (participant: unknown) => {
          console.log('[Test] Te uniste a la conferencia:', participant)
          setIsLoading(false)
          
          if (apiRef.current) {
            apiRef.current.executeCommand('subject', 'Sala de Prueba - Campus Lingowow')
          }
        })

        apiRef.current.addEventListener('videoConferenceLeft', () => {
          console.log('[Test] Saliste de la conferencia')
          handleMeetingEnd()
        })

      } catch (error) {
        console.error('[Test] Error inicializando Jitsi:', error)
        setError(error instanceof Error ? error.message : 'Error desconocido')
        setIsLoading(false)
      }
    }

    initializeJitsi()

    return () => {
      if (apiRef.current) {
        apiRef.current.dispose()
        apiRef.current = null
        isInitializedRef.current = false
      }
    }
  }, [isScriptLoaded, roomName, handleMeetingEnd])

  const handleRetry = () => {
    setError(null)
    isInitializedRef.current = false
    setIsScriptLoaded(false)
    
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
      <div className="flex items-center justify-center h-full bg-gray-900">
        <div className="text-center text-white max-w-md mx-auto p-6">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <h2 className="text-xl font-semibold mb-2">Error en la Videollamada de Prueba</h2>
          <p className="text-gray-300 mb-4">{error}</p>
          <div className="space-x-4">
            <Button onClick={handleRetry} variant="default">
              Reintentar
            </Button>
            <Button 
              onClick={handleMeetingEnd} 
              variant="outline"
            >
              Volver
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full bg-gray-900">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
          <div className="text-center text-white">
            <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin" />
            <h2 className="text-xl font-semibold mb-2">Iniciando Videollamada de Prueba</h2>
            <p className="text-gray-300">Conectando con Campus Lingowow...</p>
            <p className="text-gray-400 text-sm mt-2">Sala: {roomName}</p>
          </div>
        </div>
      )}
      
      <div 
        ref={containerRef} 
        className="w-full h-full"
        style={{ minHeight: 'calc(100vh - 52px)' }}
      />
    </div>
  )
}
