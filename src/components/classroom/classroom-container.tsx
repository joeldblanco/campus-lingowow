'use client'

import { Button } from '@/components/ui/button'
import { getLessonContent, getContentById, getShareableContent, ShareableContent } from '@/lib/actions/classroom'
import { LessonForView } from '@/types/lesson'
import { Loader2, MessageSquare, X } from 'lucide-react'
import { useEffect, useState, useRef, useCallback } from 'react'
import { toast } from 'sonner'
import { startRecording, stopRecording } from '@/lib/actions/classroom-recording'
import { ActiveLessonViewer } from './active-lesson-viewer'
import { ClassroomLayout } from './classroom-layout'
import { ControlBar } from './control-bar'
import { LiveKitProvider, useLiveKit } from './livekit-context'
import { DeviceErrorBanner } from './device-error-banner'
import { VideoGrid } from './video-grid'
import { ExcalidrawWhiteboard } from './excalidraw-whiteboard'
import { ClassroomChat } from './classroom-chat'
import { ShareContentPopover } from './share-content-popover'
import { CollaborationProvider } from './collaboration-context'
import { CollaborativeContentWrapper } from './collaborative-content-wrapper'
import { ScreenShareViewer } from './screen-share-viewer'

// Grace period constant - 10 minutes in milliseconds
const GRACE_PERIOD_MS = 10 * 60 * 1000

interface ClassroomContainerProps {
  roomName: string
  jwt: string | null
  bookingId?: string // Now optional for syncing context
  lessonData?: LessonForView // Initial/Default (can be null)
  startTime: Date
  endTime: Date
  userDisplayName: string
  isTeacher: boolean
  onMeetingEnd: () => void
}

function ClassroomInner({
  roomName,
  jwt,
  bookingId,
  lessonData: initialLessonData,
  startTime,
  endTime,
  isTeacher,
  onMeetingEnd,
}: ClassroomContainerProps) {
  const {
    isInitialized,
    joinRoom,
    connectionStatus,
    localTracks,
    remoteTracks,
    toggleVideo,
    toggleAudio,
    isAudioMuted,
    isVideoMuted,
    leaveRoom,
    sendCommand,
    addCommandListener,
    removeCommandListener,
    toggleScreenShare,
    toggleRaiseHand,
    isScreenSharing,
    isHandRaised,
    remoteScreenShareTrack,
    deviceError,
    clearDeviceError,
    retryDeviceAccess,
  } = useLiveKit()

  const [timeLeft, setTimeLeft] = useState('')
  const [isGracePeriod, setIsGracePeriod] = useState(false)
  const [isPreClass, setIsPreClass] = useState(false)
  const [activeLesson, setActiveLesson] = useState<LessonForView | undefined>(initialLessonData)
  const [isLoadingLesson, setIsLoadingLesson] = useState(false)
  const [mainContentTab, setMainContentTab] = useState<'lesson' | 'whiteboard' | 'screenshare'>('lesson')
  const [isRecording, setIsRecording] = useState(false)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [hasUnreadChat, setHasUnreadChat] = useState(false)
  const [isSharePopoverOpen, setIsSharePopoverOpen] = useState(false)
  const [shareableContent, setShareableContent] = useState<ShareableContent[] | null>(null)
  const [egressId, setEgressId] = useState<string | null>(null)
  const recordingRef = useRef(false)
  const stoppingRecordingRef = useRef(false)
  const retryCountRef = useRef(0)
  const activeLessonRef = useRef<{ id: string; type: ShareableContent['type'] } | null>(null)

  // Refs to access current recording values without triggering effect restarts
  const isRecordingRef = useRef(isRecording)
  const egressIdRef = useRef(egressId)


  // Pre-load all shareable content metadata once on mount (teacher only)
  useEffect(() => {
    if (isTeacher) {
      getShareableContent().then(setShareableContent)
    }
  }, [isTeacher])

  // Update refs when state changes
  useEffect(() => {
    isRecordingRef.current = isRecording
  }, [isRecording])

  useEffect(() => {
    egressIdRef.current = egressId
  }, [egressId])

  // Timer Logic - Calculate time remaining until class end with 10-minute grace period
  // Now considers startTime: shows countdown to start if before class, then countdown to end
  useEffect(() => {
    const startTimestamp = startTime instanceof Date ? startTime.getTime() : new Date(startTime).getTime()
    const endTimestamp = endTime instanceof Date ? endTime.getTime() : new Date(endTime).getTime()
    // Grace period ends exactly 10 minutes after the scheduled class end time
    const graceEndTimestamp = endTimestamp + GRACE_PERIOD_MS

    const calculateTimeLeft = () => {
      const now = Date.now()
      const diffToStart = startTimestamp - now
      const diffToEnd = endTimestamp - now
      const diffToGraceEnd = graceEndTimestamp - now

      // Grace period has ended - keep showing 00:00 but don't auto-close
      if (diffToGraceEnd <= 0) {
        return { time: '00:00', isGrace: true, isPreClass: false }
      }

      // Class time has ended, but still in grace period
      if (diffToEnd <= 0) {
        // Show countdown of grace period remaining (from 10:00 down to 00:00)
        const graceMinutes = Math.floor(diffToGraceEnd / (1000 * 60))
        const graceSeconds = Math.floor((diffToGraceEnd % (1000 * 60)) / 1000)

        return {
          time: `${graceMinutes.toString().padStart(2, '0')}:${graceSeconds.toString().padStart(2, '0')}`,
          isGrace: true,
          isPreClass: false,
        }
      }

      // Before class start time - show countdown to class start
      if (diffToStart > 0) {
        const hours = Math.floor(diffToStart / (1000 * 60 * 60))
        const minutes = Math.floor((diffToStart % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((diffToStart % (1000 * 60)) / 1000)

        if (hours > 0) {
          return {
            time: `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
            isGrace: false,
            isPreClass: true,
          }
        }

        return {
          time: `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
          isGrace: false,
          isPreClass: true,
        }
      }

      // Normal class time - show time remaining until scheduled end
      const hours = Math.floor(diffToEnd / (1000 * 60 * 60))
      const minutes = Math.floor((diffToEnd % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diffToEnd % (1000 * 60)) / 1000)

      if (hours > 0) {
        return {
          time: `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
          isGrace: false,
          isPreClass: false,
        }
      }

      return {
        time: `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
        isGrace: false,
        isPreClass: false,
      }
    }

    const updateTimer = () => {
      const result = calculateTimeLeft()
      setTimeLeft(result.time)
      setIsGracePeriod(result.isGrace)
      setIsPreClass(result.isPreClass)
    }

    updateTimer()

    const timer = setInterval(updateTimer, 1000)

    return () => clearInterval(timer)
  }, [startTime, endTime])

  // Auto-join when initialized
  useEffect(() => {
    if (isInitialized && connectionStatus === 'disconnected') {
      joinRoom(roomName, jwt)
    }
  }, [isInitialized, connectionStatus, joinRoom, roomName, jwt])

  // Auto-retry on failure with exponential backoff (max 3 attempts)
  useEffect(() => {
    if (connectionStatus !== 'failed') return

    const attempt = retryCountRef.current
    if (attempt >= 3) return // Stop after 3 auto-retries; user can still use manual button

    const delay = Math.min(2000 * Math.pow(2, attempt), 10000)
    console.log(`[Classroom] Auto-retry #${attempt + 1} in ${delay}ms`)

    const timer = setTimeout(() => {
      retryCountRef.current += 1
      joinRoom(roomName, jwt)
    }, delay)

    return () => clearTimeout(timer)
  }, [connectionStatus, joinRoom, roomName, jwt])

  // Stop recording via sendBeacon when user closes tab/navigates away
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isRecordingRef.current && egressIdRef.current && bookingId) {
        const payload = JSON.stringify({ egressId: egressIdRef.current, bookingId })
        navigator.sendBeacon('/api/livekit/stop-recording', new Blob([payload], { type: 'application/json' }))
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [bookingId])

  // Auto-start recording when ANY user connects (teacher or student)
  // Recording starts when user joins and stops when they leave
  useEffect(() => {
    const autoStartRecording = async () => {
      if (connectionStatus === 'connected' && bookingId && !isRecording && !recordingRef.current) {
        recordingRef.current = true
        try {
          const result = await startRecording(bookingId, roomName)
          if (result.success && result.egressId) {
            setIsRecording(true)
            setEgressId(result.egressId)
            if (!result.alreadyRecording) {
              console.log(`Recording started - segment ${result.segmentNumber}`)
            }
          } else {
            // Reset ref to allow retry if startRecording returns failure without throwing
            console.error('Auto-recording failed:', result.error)
            recordingRef.current = false
          }
        } catch (error) {
          console.error('Auto-recording failed:', error)
          recordingRef.current = false
        }
      }
    }
    autoStartRecording()
  }, [connectionStatus, bookingId, roomName, isRecording])


  // Auto-switch to screenshare tab when a remote screen share track appears (student side)
  useEffect(() => {
    if (remoteScreenShareTrack) {
      setMainContentTab('screenshare')
    } else if (mainContentTab === 'screenshare' && !isScreenSharing) {
      setMainContentTab('lesson')
    }
  }, [remoteScreenShareTrack, isScreenSharing, mainContentTab])

  // Ref to track current tab for sync requests
  const mainContentTabRef = useRef(mainContentTab)
  useEffect(() => {
    mainContentTabRef.current = mainContentTab
  }, [mainContentTab])

  // Listen for lesson change commands, tab sync, and sync requests
  useEffect(() => {
    const handleSetLesson = async (data: Record<string, unknown>) => {
      if (data.type === 'SET_LESSON') {
        const lessonId = data.lessonId
        const contentType = data.contentType as ShareableContent['type'] | undefined

        // Handle stop sharing
        if (!lessonId) {
          setActiveLesson(undefined)
          toast.info('El profesor ha detenido la compartición.')
          return
        }

        if (typeof lessonId === 'string') {
          try {
            setIsLoadingLesson(true)
            const content = contentType
              ? await getContentById(lessonId, contentType)
              : await getLessonContent(lessonId)
            if (content) {
              setActiveLesson(content as unknown as LessonForView)
              toast.info('El profesor ha compartido contenido.')
            }
          } catch (error) {
            console.error('Failed to sync lesson', error)
          } finally {
            setIsLoadingLesson(false)
          }
        }
      }
    }

    // Handle tab sync from teacher (for students)
    const handleSetTab = (data: Record<string, unknown>) => {
      if (data.type === 'SET_TAB' && !isTeacher) {
        const tab = data.tab as 'lesson' | 'whiteboard' | 'screenshare'
        if (tab && ['lesson', 'whiteboard', 'screenshare'].includes(tab)) {
          setMainContentTab(tab)
        }
      }
    }

    // Teacher responds to sync requests from students
    const handleSyncRequest = (data: Record<string, unknown>) => {
      if (data.type === 'REQUEST_SYNC' && isTeacher) {
        // Sync current tab
        sendCommand('set-tab', { type: 'SET_TAB', tab: mainContentTabRef.current })
        // Sync current lesson if any
        if (activeLessonRef.current) {
          sendCommand('set-lesson', {
            type: 'SET_LESSON',
            lessonId: activeLessonRef.current.id,
            contentType: activeLessonRef.current.type
          })
        }
      }
    }

    if (connectionStatus === 'connected') {
      addCommandListener('set-lesson', handleSetLesson)
      addCommandListener('set-tab', handleSetTab)
      addCommandListener('sync-request', handleSyncRequest)

      // Student requests current state when connecting
      if (!isTeacher) {
        sendCommand('sync-request', { type: 'REQUEST_SYNC' })
      }
    }

    return () => {
      removeCommandListener('set-lesson', handleSetLesson)
      removeCommandListener('set-tab', handleSetTab)
      removeCommandListener('sync-request', handleSyncRequest)
    }
  }, [connectionStatus, addCommandListener, removeCommandListener, isTeacher, sendCommand])

  const handleContentSelect = async (contentId: string, contentType: ShareableContent['type']) => {
    // Stop other share types before sharing Lingowow content
    if (isScreenSharing) toggleScreenShare()
    if (mainContentTab === 'whiteboard') handleTabChange('lesson')

    try {
      setIsLoadingLesson(true)
      const content = await getContentById(contentId, contentType)
      if (content) {
        setActiveLesson(content as unknown as LessonForView)
        // Store reference for sync requests
        activeLessonRef.current = { id: contentId, type: contentType }
        // Broadcast change to students with type info
        sendCommand('set-lesson', { type: 'SET_LESSON', lessonId: contentId, contentType })
        toast.success('Contenido compartido con el estudiante')
      } else {
        toast.error('No se pudo cargar el contenido')
      }
    } catch (error) {
      console.error('Failed to load content', error)
      toast.error('Error al cargar el contenido')
    } finally {
      setIsLoadingLesson(false)
    }
  }

  const handleStopContentShare = () => {
    setActiveLesson(undefined)
    activeLessonRef.current = null
    sendCommand('set-lesson', { type: 'SET_LESSON', lessonId: null, contentType: null })
    toast.info('Compartición de contenido detenida')
  }

  // Teacher changes tab and syncs with student
  const handleTabChange = (tab: 'lesson' | 'whiteboard' | 'screenshare') => {
    setMainContentTab(tab)
    if (isTeacher) {
      sendCommand('set-tab', { type: 'SET_TAB', tab })
    }
  }

  const handleLeave = async () => {
    await leaveRoom()
    onMeetingEnd()
  }

  const handleEndCall = async () => {
    // Stop recording automatically when call ends (guard against concurrent calls)
    if (isRecording && egressId && !stoppingRecordingRef.current) {
      stoppingRecordingRef.current = true
      try {
        const result = await stopRecording(egressId, bookingId)
        console.log('Recording stopped on end call:', result.message)
      } catch (error) {
        console.error('Failed to stop recording:', error)
      } finally {
        stoppingRecordingRef.current = false
      }
    }
    await leaveRoom()
    onMeetingEnd()
  }

  // Handle new message notification
  const handleNewChatMessage = useCallback(() => {
    if (!isChatOpen) {
      setHasUnreadChat(true)
      // Play notification sound using Web Audio API
      try {
        const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
        const oscillator = ctx.createOscillator()
        const gain = ctx.createGain()
        oscillator.connect(gain)
        gain.connect(ctx.destination)
        oscillator.type = 'sine'
        oscillator.frequency.setValueAtTime(830, ctx.currentTime)
        oscillator.frequency.setValueAtTime(1000, ctx.currentTime + 0.1)
        gain.gain.setValueAtTime(0.15, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
        oscillator.start(ctx.currentTime)
        oscillator.stop(ctx.currentTime + 0.3)
      } catch {
        // Silently ignore audio errors
      }
    }
  }, [isChatOpen])

  const handleToggleChat = useCallback(() => {
    setIsChatOpen(prev => {
      if (!prev) {
        // Opening chat — clear unread
        setHasUnreadChat(false)
      }
      return !prev
    })
  }, [])

  if (connectionStatus === 'connecting' || !isInitialized) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#202124]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white">Conectando al aula...</h2>
          <p className="text-white/60">Preparando tu entorno de aprendizaje</p>
        </div>
      </div>
    )
  }

  if (connectionStatus === 'failed') {
    const isAutoRetrying = retryCountRef.current < 3
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#202124]">
        <div className="text-center max-w-md p-6 bg-[#292a2d] rounded-xl shadow-lg">
          <h2 className="text-xl font-bold text-red-400 mb-2">Error de Conexión</h2>
          <p className="text-white/60 mb-4">No pudimos conectar con el servidor de video.</p>
          {isAutoRetrying ? (
            <div className="flex items-center justify-center gap-2 text-white/50 mb-4">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Reintentando automáticamente ({retryCountRef.current}/3)...</span>
            </div>
          ) : (
            <p className="text-white/40 text-sm mb-4">Los reintentos automáticos se agotaron.</p>
          )}
          <div className="flex gap-3 justify-center">
            <Button
              onClick={() => {
                retryCountRef.current = 0
                joinRoom(roomName, jwt)
              }}
            >
              Reintentar conexión
            </Button>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Recargar página
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Determine if content is being shared (by anyone)
  const isContentSharing = !!activeLesson || mainContentTab === 'whiteboard' || isScreenSharing || !!remoteScreenShareTrack

  // Handle share popover actions — auto-stop previous sharing first
  const handleShareScreen = () => {
    // Stop other share types before starting screen share
    if (activeLesson) handleStopContentShare()
    if (mainContentTab === 'whiteboard') handleTabChange('lesson')
    toggleScreenShare()
    if (!isScreenSharing) {
      handleTabChange('screenshare')
    }
  }

  const handleShareWhiteboard = () => {
    // Stop other share types before starting whiteboard
    if (activeLesson) handleStopContentShare()
    if (isScreenSharing) toggleScreenShare()
    handleTabChange('whiteboard')
  }

  const handleStopAllSharing = () => {
    if (activeLesson) handleStopContentShare()
    if (isScreenSharing) toggleScreenShare()
    handleTabChange('lesson')
  }

  // Render the main video area (side-by-side)
  const renderVideoArea = (
    <VideoGrid
      localTrack={localTracks}
      remoteTracks={remoteTracks}
      isTeacher={isTeacher}
    />
  )

  // Render compact stacked video area (for sharing mode overlay)
  const renderCompactVideoArea = (
    <VideoGrid
      localTrack={localTracks}
      remoteTracks={remoteTracks}
      isTeacher={isTeacher}
      compact
    />
  )

  // Chat side panel
  const renderChatPanel = (
    <div className="h-full flex flex-col bg-[#292a2d] rounded-xl overflow-hidden">
      {/* Chat Header */}
      <div className="flex-none p-3 bg-[#3c4043] flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-white/80" />
        <h3 className="font-medium text-white/90 text-sm">Chat de Clase</h3>
      </div>

      {/* Chat Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {bookingId ? (
          <ClassroomChat bookingId={bookingId} onNewMessage={handleNewChatMessage} />
        ) : (
          <div className="h-full flex items-center justify-center text-white/40 text-sm">
            Chat no disponible
          </div>
        )}
      </div>
    </div>
  )

  // Render shared content (fills main area when sharing)
  const renderSharedContent = () => {
    if (isLoadingLesson) {
      return (
        <div className="w-full h-full flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
        </div>
      )
    }

    if (mainContentTab === 'whiteboard') {
      return <ExcalidrawWhiteboard bookingId={bookingId} isTeacher={isTeacher} />
    }

    if (mainContentTab === 'screenshare' || isScreenSharing || remoteScreenShareTrack) {
      return <ScreenShareViewer />
    }

    if (activeLesson) {
      return (
        <CollaborativeContentWrapper className="min-h-full">
          <ActiveLessonViewer
            lessonData={activeLesson}
            isTeacher={isTeacher}
            onContentSelect={handleContentSelect}
          />
        </CollaborativeContentWrapper>
      )
    }

    return null
  }

  // Sharing banner
  const renderSharingBanner = isContentSharing ? (
    <div className="flex-none px-4 py-1.5 bg-green-600/20 flex items-center justify-center gap-3">
      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
      <span className="text-xs text-green-400 font-medium">
        {isScreenSharing || remoteScreenShareTrack ? 'Compartiendo pantalla' : mainContentTab === 'whiteboard' ? 'Pizarra activa' : 'Compartiendo contenido'}
      </span>
      {isTeacher && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleStopAllSharing}
          className="gap-1 h-6 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/20 px-2"
        >
          <X className="w-3 h-3" />
          Detener
        </Button>
      )}
    </div>
  ) : null

  return (
    <>
      <ClassroomLayout
        lessonTitle={activeLesson?.title || 'Aula Virtual'}
        timeLeft={timeLeft}
        isGracePeriod={isGracePeriod}
        isPreClass={isPreClass}
        videoArea={renderVideoArea}
        compactVideoArea={renderCompactVideoArea}
        sidePanel={isChatOpen ? renderChatPanel : undefined}
        isContentSharing={isContentSharing}
        fullscreenContent={mainContentTab === 'whiteboard' || mainContentTab === 'screenshare' || isScreenSharing || !!remoteScreenShareTrack}
        sharingBanner={renderSharingBanner}
        topBanner={
          deviceError ? (
            <DeviceErrorBanner
              type={deviceError.type}
              message={deviceError.message}
              canRetry={deviceError.canRetry}
              onRetry={retryDeviceAccess}
              onDismiss={clearDeviceError}
            />
          ) : null
        }
        bottomControls={
          <ControlBar
            isMicMuted={isAudioMuted}
            isVideoMuted={isVideoMuted}
            onToggleMic={toggleAudio}
            onToggleVideo={toggleVideo}
            onEndCall={handleEndCall}
            onLeave={handleLeave}
            onToggleHand={toggleRaiseHand}
            isHandRaised={isHandRaised}
            isRecording={isRecording}
            isTeacher={isTeacher}
            isChatOpen={isChatOpen}
            hasUnreadChat={hasUnreadChat}
            onToggleChat={handleToggleChat}
            isSharing={isContentSharing}
            onToggleShare={() => setIsSharePopoverOpen(prev => !prev)}
          />
        }
      >
        {isContentSharing ? renderSharedContent() : null}
      </ClassroomLayout>

      {/* Share Content Popover */}
      <ShareContentPopover
        isTeacher={isTeacher}
        isOpen={isSharePopoverOpen}
        onClose={() => setIsSharePopoverOpen(false)}
        onShareScreen={handleShareScreen}
        onShareContent={handleContentSelect}
        onShareWhiteboard={handleShareWhiteboard}
        isScreenSharing={isScreenSharing}
        someoneElseIsSharing={!!remoteTracks.find(t => t.videoTrack) && isScreenSharing}
        preloadedContent={shareableContent}
      />
    </>
  )
}

export function ClassroomContainer(props: ClassroomContainerProps) {
  return (
    <LiveKitProvider>
      <CollaborationProvider
        isTeacher={props.isTeacher}
        participantName={props.userDisplayName}
      >
        <ClassroomInner {...props} />
      </CollaborationProvider>
    </LiveKitProvider>
  )
}
