'use client'

import { Button } from '@/components/ui/button'
import { getLessonContent, getContentById, ShareableContent } from '@/lib/actions/classroom'
import { LessonForView } from '@/types/lesson'
import { BookOpen, Loader2, PenTool, Monitor, X } from 'lucide-react'
import { useEffect, useState, useRef } from 'react'
import { toast } from 'sonner'
import { startRecording, stopRecording } from '@/lib/actions/classroom-recording'
import { ActiveLessonViewer } from './active-lesson-viewer'
import { ClassroomLayout } from './classroom-layout'
import { ControlBar } from './control-bar'
import { LiveKitProvider, useLiveKit } from './livekit-context'
import { VideoGrid } from './video-grid'
import { ExcalidrawWhiteboard } from './excalidraw-whiteboard'
import { ClassroomChat } from './classroom-chat'
import { CollaborationProvider } from './collaboration-context'
import { CollaborativeContentWrapper } from './collaborative-content-wrapper'
import { ScreenShareViewer } from './screen-share-viewer'

interface ClassroomContainerProps {
  roomName: string
  jwt: string | null
  bookingId?: string // Now optional for syncing context
  lessonData?: LessonForView // Initial/Default (can be null)
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
  } = useLiveKit()

  const [timeLeft, setTimeLeft] = useState('')
  const [activeLesson, setActiveLesson] = useState<LessonForView | undefined>(initialLessonData)
  const [isLoadingLesson, setIsLoadingLesson] = useState(false)
  const [mainContentTab, setMainContentTab] = useState<'lesson' | 'whiteboard' | 'screenshare'>('lesson')
  const [isRecording, setIsRecording] = useState(false)
  const [egressId, setEgressId] = useState<string | null>(null)
  const recordingRef = useRef(false)
  const activeLessonRef = useRef<{ id: string; type: ShareableContent['type'] } | null>(null)

  // Timer Logic - Calculate time remaining until class end
  useEffect(() => {
    const endTimestamp = endTime instanceof Date ? endTime.getTime() : new Date(endTime).getTime()
    
    const calculateTimeLeft = () => {
      const now = Date.now()
      const diff = endTimestamp - now
      
      if (diff <= 0) return '00:00'
      
      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)
      
      if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      }
      
      return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }
    
    setTimeLeft(calculateTimeLeft())
    
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft())
    }, 1000)
    
    return () => clearInterval(timer)
  }, [endTime])

  // Auto-join when initialized
  useEffect(() => {
    if (isInitialized && connectionStatus === 'disconnected') {
      joinRoom(roomName, jwt)
    }
  }, [isInitialized, connectionStatus, joinRoom, roomName, jwt])

  // Auto-start recording when teacher connects (automatic, no manual control)
  useEffect(() => {
    const autoStartRecording = async () => {
      if (connectionStatus === 'connected' && isTeacher && bookingId && !isRecording && !recordingRef.current) {
        recordingRef.current = true
        try {
          const result = await startRecording(bookingId, roomName)
          if (result.success && result.egressId) {
            setIsRecording(true)
            setEgressId(result.egressId)
          }
        } catch (error) {
          console.error('Auto-recording failed:', error)
        }
      }
    }
    autoStartRecording()
  }, [connectionStatus, isTeacher, bookingId, roomName, isRecording])

  
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
        await stopRecording(egressId)
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

  // Sidebar: Videos arriba + Chat abajo (diseño según imagen)
  const handleBackClick = async () => {
    await leaveRoom()
  }

  const renderSidebar = (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-none p-3 border-b bg-white flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">Lesson Chat</h3>
          <p className="text-xs text-gray-500">Corrections & Vocabulary</p>
        </div>
      </div>

      {/* Videos - Stacked vertically */}
      <div className="flex-none p-3 space-y-2">
        <VideoGrid localTrack={localTracks} remoteTracks={remoteTracks} isTeacher={isTeacher} />
      </div>

      {/* Chat - Takes remaining space */}
      <div className="flex-1 min-h-0">
        {bookingId ? (
          <ClassroomChat bookingId={bookingId} />
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400 text-sm">
            Chat no disponible
          </div>
        )}
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
        return <ScreenShareViewer isTeacher={isTeacher} />
      default:
        return (
          <CollaborativeContentWrapper className="h-full overflow-auto">
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
      rightSidebar={renderSidebar}
      leftSidebar={renderLeftSidebar}
      onBackClick={handleBackClick}
      bottomControls={
        <ControlBar
          isMicMuted={isAudioMuted}
          isVideoMuted={isVideoMuted}
          onToggleMic={toggleAudio}
          onToggleVideo={toggleVideo}
          onEndCall={handleEndCall}
          onToggleScreenShare={toggleScreenShare}
          onToggleHand={toggleRaiseHand}
          isScreenSharing={isScreenSharing}
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
          {isTeacher && isScreenSharing && (
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
