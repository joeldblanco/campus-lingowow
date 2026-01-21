'use client'

import { Button } from '@/components/ui/button'
import { getLessonContent, getContentById, ShareableContent } from '@/lib/actions/classroom'
import { LessonForView } from '@/types/lesson'
import { BookOpen, Loader2, PenTool, Monitor, X, ChevronDown, ChevronUp, MessageSquare } from 'lucide-react'
import { useEffect, useState, useRef } from 'react'
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
    toggleScreenShare,
    toggleRaiseHand,
    isScreenSharing,
    isHandRaised,
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
  const [isChatMinimized, setIsChatMinimized] = useState(false)
  const [egressId, setEgressId] = useState<string | null>(null)
  const recordingRef = useRef(false)
  const activeLessonRef = useRef<{ id: string; type: ShareableContent['type'] } | null>(null)

  // Refs to access current recording values without triggering effect restarts
  const isRecordingRef = useRef(isRecording)
  const egressIdRef = useRef(egressId)

  // Ref to track if we've already triggered end call
  const hasEndedRef = useRef(false)

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

      // Grace period has ended - close the class
      if (diffToGraceEnd <= 0) {
        return { time: '00:00', isGrace: true, isPreClass: false, shouldEnd: true }
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
          shouldEnd: false
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
            shouldEnd: false
          }
        }

        return {
          time: `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
          isGrace: false,
          isPreClass: true,
          shouldEnd: false
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
          shouldEnd: false
        }
      }

      return {
        time: `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
        isGrace: false,
        isPreClass: false,
        shouldEnd: false
      }
    }

    const updateTimer = async () => {
      const result = calculateTimeLeft()
      setTimeLeft(result.time)
      setIsGracePeriod(result.isGrace)
      setIsPreClass(result.isPreClass)

      if (result.shouldEnd && !hasEndedRef.current) {
        hasEndedRef.current = true
        // Stop recording automatically when grace period ends (use refs to avoid dependency issues)
        if (isRecordingRef.current && egressIdRef.current) {
          try {
            await stopRecording(egressIdRef.current, bookingId)
          } catch (error) {
            console.error('Failed to stop recording:', error)
          }
        }
        await leaveRoom()
        onMeetingEnd()
      }
    }

    updateTimer()

    const timer = setInterval(updateTimer, 1000)

    return () => clearInterval(timer)
  }, [startTime, endTime, leaveRoom, onMeetingEnd, bookingId])

  // Auto-join when initialized
  useEffect(() => {
    if (isInitialized && connectionStatus === 'disconnected') {
      joinRoom(roomName, jwt)
    }
  }, [isInitialized, connectionStatus, joinRoom, roomName, jwt])

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
          }
        } catch (error) {
          console.error('Auto-recording failed:', error)
          recordingRef.current = false
        }
      }
    }
    autoStartRecording()
  }, [connectionStatus, bookingId, roomName, isRecording])


  // Listen for lesson change commands and sync requests
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

    // Teacher responds to sync requests from students
    const handleSyncRequest = (data: Record<string, unknown>) => {
      if (data.type === 'REQUEST_SYNC' && isTeacher && activeLessonRef.current) {
        sendCommand('set-lesson', {
          type: 'SET_LESSON',
          lessonId: activeLessonRef.current.id,
          contentType: activeLessonRef.current.type
        })
      }
    }

    if (connectionStatus === 'connected') {
      addCommandListener('set-lesson', handleSetLesson)
      addCommandListener('sync-request', handleSyncRequest)

      // Student requests current state when connecting
      if (!isTeacher) {
        sendCommand('sync-request', { type: 'REQUEST_SYNC' })
      }
    }

    return () => {
      // Cleanup if possible
    }
  }, [connectionStatus, addCommandListener, isTeacher, sendCommand])

  const handleContentSelect = async (contentId: string, contentType: ShareableContent['type']) => {
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

  const handleStopScreenShare = () => {
    if (isScreenSharing) {
      toggleScreenShare()
    }
    setMainContentTab('lesson')
  }

  const handleEndCall = async () => {
    // Stop recording automatically when call ends
    if (isRecording && egressId) {
      try {
        await stopRecording(egressId, bookingId)
      } catch (error) {
        console.error('Failed to stop recording:', error)
      }
    }
    await leaveRoom()
    onMeetingEnd()
  }

  if (connectionStatus === 'connecting' || !isInitialized) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800">Conectando al aula...</h2>
          <p className="text-gray-500">Preparando tu entorno de aprendizaje</p>
        </div>
      </div>
    )
  }

  if (connectionStatus === 'failed') {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md p-6 bg-white rounded-xl shadow-lg">
          <h2 className="text-xl font-bold text-red-600 mb-2">Error de Conexión</h2>
          <p className="text-gray-600 mb-6">No pudimos conectar con el servidor de video.</p>
          <Button onClick={() => window.location.reload()}>Reintentar</Button>
        </div>
      </div>
    )
  }

  // Stop recording and leave when user navigates away (back button)
  const handleBackClick = async () => {
    // Stop recording when user leaves (creates a new segment if they rejoin)
    if (isRecording && egressId) {
      try {
        await stopRecording(egressId, bookingId)
        setIsRecording(false)
        setEgressId(null)
        recordingRef.current = false
      } catch (error) {
        console.error('Failed to stop recording on back:', error)
      }
    }
    await leaveRoom()
  }

  const renderSidebar = (
    <div className="h-full flex flex-col bg-white rounded-xl border overflow-hidden">
      {/* Videos - When chat is minimized, videos take full height stacked vertically */}
      <div className={isChatMinimized ? "flex-1 flex flex-col p-3 gap-3" : "flex-none p-3 space-y-2"}>
        <VideoGrid
          localTrack={localTracks}
          remoteTracks={remoteTracks}
          isTeacher={isTeacher}
          stacked={isChatMinimized}
        />
      </div>

      {/* Chat Section */}
      <div className="flex flex-col transition-all duration-300 ease-in-out" style={{ flex: isChatMinimized ? '0 0 auto' : '1 1 0%', minHeight: 0 }}>
        {/* Chat Header with minimize button - clickable */}
        <div
          className="flex-none p-3 border-t bg-blue-600 flex items-center justify-between cursor-pointer hover:bg-blue-700 transition-colors"
          onClick={() => setIsChatMinimized(!isChatMinimized)}
          title={isChatMinimized ? "Expandir chat" : "Minimizar chat"}
        >
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-white" />
            <div>
              <h3 className="font-semibold text-white text-sm">Chat de Clase</h3>
              <p className={`text-xs text-blue-100 transition-all duration-300 overflow-hidden ${isChatMinimized ? 'max-h-0 opacity-0' : 'max-h-5 opacity-100'}`}>
                Correcciones y Vocabulario
              </p>
            </div>
          </div>
          <div className="h-8 w-8 flex items-center justify-center">
            {isChatMinimized ? (
              <ChevronUp className="w-4 h-4 text-white" />
            ) : (
              <ChevronDown className="w-4 h-4 text-white" />
            )}
          </div>
        </div>

        {/* Chat Content - Animated visibility */}
        <div className={`flex-1 min-h-0 transition-all duration-300 ease-in-out ${isChatMinimized ? 'max-h-0 opacity-0 overflow-hidden' : 'opacity-100 overflow-hidden'}`}>
          {bookingId ? (
            <ClassroomChat bookingId={bookingId} />
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400 text-sm">
              Chat no disponible
            </div>
          )}
        </div>
      </div>
    </div>
  )

  const renderLeftSidebar = null

  const renderMainContent = () => {
    if (isLoadingLesson) {
      return (
        <div className="w-full h-full flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      )
    }

    switch (mainContentTab) {
      case 'whiteboard':
        return <ExcalidrawWhiteboard bookingId={bookingId} isTeacher={isTeacher} />
      case 'screenshare':
        return <ScreenShareViewer />
      default:
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
  }

  return (
    <ClassroomLayout
      lessonTitle={activeLesson?.title || 'Aula Virtual'}
      timeLeft={timeLeft}
      isGracePeriod={isGracePeriod}
      isPreClass={isPreClass}
      rightSidebar={renderSidebar}
      leftSidebar={renderLeftSidebar}
      onBackClick={handleBackClick}
      fullscreenContent={mainContentTab === 'whiteboard' || mainContentTab === 'screenshare'}
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
          onToggleHand={toggleRaiseHand}
          isHandRaised={isHandRaised}
          isRecording={isRecording}
        />
      }
      contentTabs={
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
            <Button
              variant={mainContentTab === 'lesson' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setMainContentTab('lesson')}
              className="gap-2"
            >
              <BookOpen className="w-4 h-4" />
              Contenido
            </Button>
            <Button
              variant={mainContentTab === 'whiteboard' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setMainContentTab('whiteboard')}
              className="gap-2"
            >
              <PenTool className="w-4 h-4" />
              Pizarra
            </Button>
            <Button
              variant={mainContentTab === 'screenshare' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setMainContentTab('screenshare')}
              className="gap-2"
            >
              <Monitor className="w-4 h-4" />
              Pantalla
            </Button>
          </div>

          {/* Stop sharing buttons */}
          {isTeacher && activeLesson && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleStopContentShare}
              className="gap-2 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
            >
              <X className="w-4 h-4" />
              Detener Contenido
            </Button>
          )}
          {isScreenSharing && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleStopScreenShare}
              className="gap-2 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
            >
              <X className="w-4 h-4" />
              Detener Pantalla
            </Button>
          )}
        </div>
      }
    >
      {renderMainContent()}
    </ClassroomLayout>
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
