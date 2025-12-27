'use client'

import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getLessonContent } from '@/lib/actions/classroom'
import { LessonForView } from '@/types/lesson'
import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { ActiveLessonViewer } from './active-lesson-viewer'
import { ClassroomLayout } from './classroom-layout'
import { ControlBar } from './control-bar'
import { JitsiProvider, useJitsi } from './jitsi-context'
import { LessonSelector } from './lesson-selector'
import { VideoGrid } from './video-grid'

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
  } = useJitsi()

  const [timeLeft, setTimeLeft] = useState('')
  const [activeLesson, setActiveLesson] = useState<LessonForView | undefined>(initialLessonData)
  const [isLoadingLesson, setIsLoadingLesson] = useState(false)

  // Timer Logic
  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime()
      const end = new Date(endTime).getTime()
      const diff = end - now
      if (diff <= 0) return '00:00'
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)
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

  // Listen for lesson change commands
  useEffect(() => {
    const handleCommand = async (data: Record<string, unknown>) => {
      if (data.type === 'SET_LESSON') {
        const lessonId = data.lessonId
        if (typeof lessonId === 'string') {
          await fetchAndSetLesson(lessonId)
        }
      }
    }

    // Wait for Jitsi to be ready before adding listeners
    if (connectionStatus === 'connected') {
      addCommandListener('set-lesson', handleCommand)
    }

    return () => {
      // Cleanup if possible
    }
  }, [connectionStatus, addCommandListener])

  const fetchAndSetLesson = async (lessonId: string) => {
    try {
      setIsLoadingLesson(true)
      const content = await getLessonContent(lessonId)
      if (content) {
        // Cast to match expected type (temporary until strict types are aligned)
        setActiveLesson(content as unknown as LessonForView)
        if (!isTeacher) {
          toast.info('El profesor ha cambiado la lección.')
        }
      }
    } catch (error) {
      console.error('Failed to sync lesson', error)
      toast.error('Error al sincronizar la lección')
    } finally {
      setIsLoadingLesson(false)
    }
  }

  const handleLessonSelect = async (lessonId: string) => {
    await fetchAndSetLesson(lessonId)
    // Broadcast change to students
    sendCommand('set-lesson', { type: 'SET_LESSON', lessonId })
  }

  const handleEndCall = async () => {
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

  // Fix: Render Sidebar content directly to avoid re-mounting on every render (which causes flickering)
  const renderSidebar = (
    <div className="h-full flex flex-col gap-4">
      <div className="flex-none h-auto max-h-[60%] aspect-video w-full mx-auto">
        {/* Adjusted height/layout for videos */}
        <VideoGrid localTrack={localTracks} remoteTracks={remoteTracks} isTeacher={isTeacher} />
      </div>

      <div className="flex-1 min-h-0">
        {isTeacher && bookingId ? (
          <Tabs defaultValue="content" className="h-full flex flex-col">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="content">Contenido</TabsTrigger>
              <TabsTrigger value="chat">Chat</TabsTrigger>
            </TabsList>
            <TabsContent value="content" className="flex-1 mt-2 min-h-0">
              <LessonSelector bookingId={bookingId} onLessonSelect={handleLessonSelect} />
            </TabsContent>
            <TabsContent
              value="chat"
              className="flex-1 mt-2 min-h-0 bg-white rounded-xl border p-4"
            >
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                Chat Próximamente
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          // Student View: Only Chat (or other student tools later)
          <div className="h-full bg-white rounded-xl border flex flex-col">
            <div className="p-3 border-b font-medium bg-gray-50">Chat de Clase</div>
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
              El chat estará disponible próximamente
            </div>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <ClassroomLayout
      lessonTitle={activeLesson?.title || 'Aula Virtual'}
      timeLeft={timeLeft}
      rightSidebar={renderSidebar}
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
        />
      }
    >
      {isLoadingLesson ? (
        <div className="w-full h-full flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <ActiveLessonViewer lessonData={activeLesson} />
      )}
    </ClassroomLayout>
  )
}

export function ClassroomContainer(props: ClassroomContainerProps) {
  return (
    <JitsiProvider>
      <ClassroomInner {...props} />
    </JitsiProvider>
  )
}
