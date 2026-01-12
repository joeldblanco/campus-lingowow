'use client'

import { useState, useEffect, useMemo } from 'react'
import { LessonContent } from '@/components/lessons/lesson-content'
import { LessonForView } from '@/types/lesson'
import { Button } from '@/components/ui/button'
import { Loader2, Plus, BookOpen } from 'lucide-react'
import { ContentPicker } from './content-picker'
import { ShareableContent, getShareableContent } from '@/lib/actions/classroom'
import { StudentResponsesPanel } from './interactive-block-wrapper'
import { ClassroomSyncContext } from './use-classroom-sync'
import { useCollaboration } from './collaboration-context'

interface ActiveLessonViewerProps {
  lessonId?: string
  lessonData?: LessonForView
  isLoading?: boolean
  isTeacher?: boolean
  onContentSelect?: (contentId: string, contentType: ShareableContent['type']) => void
}

export function ActiveLessonViewer({ lessonData, isLoading, isTeacher, onContentSelect }: ActiveLessonViewerProps) {
  const [showContentPicker, setShowContentPicker] = useState(false)
  const [preloadedContent, setPreloadedContent] = useState<ShareableContent[] | null>(null)
  
  // Get collaboration context for syncing block responses
  const { 
    sendBlockResponse, 
    syncBlockNavigation,
    remoteBlockNavigation,
    isTeacher: isTeacherFromContext 
  } = useCollaboration()
  
  // Use context isTeacher if available, otherwise use prop
  const effectiveIsTeacher = isTeacher ?? isTeacherFromContext
  
  // Memoize the sync context value
  // Only students should be able to send responses (not teachers)
  const syncContextValue = useMemo(() => ({
    sendBlockResponse,
    syncBlockNavigation,
    remoteBlockNavigation,
    isInClassroom: true,
    isTeacher: effectiveIsTeacher,
  }), [sendBlockResponse, syncBlockNavigation, remoteBlockNavigation, effectiveIsTeacher])

  // Pre-load content for teachers to eliminate loading state when opening picker
  useEffect(() => {
    if (isTeacher && !lessonData && !preloadedContent) {
      getShareableContent().then(setPreloadedContent)
    }
  }, [isTeacher, lessonData, preloadedContent])

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400">
        <Loader2 className="w-10 h-10 animate-spin mb-4 text-blue-500" />
        <p>Cargando lección...</p>
      </div>
    )
  }

  // Show content picker when teacher clicks the button
  if (showContentPicker && isTeacher) {
    return (
      <ContentPicker
        initialContent={preloadedContent}
        onSelect={(contentId, contentType) => {
          onContentSelect?.(contentId, contentType)
          setShowContentPicker(false)
        }}
        onCancel={() => setShowContentPicker(false)}
      />
    )
  }

  if (!lessonData) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 bg-white/50 rounded-xl border border-dashed border-gray-300">
        <div className="text-center max-w-sm px-6">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Bienvenido al Aula</h3>
          
          {isTeacher ? (
            <>
              <p className="text-sm text-gray-500 mb-6">
                Selecciona un contenido de la biblioteca para compartirlo con tu estudiante durante la clase.
              </p>
              <Button 
                onClick={() => setShowContentPicker(true)}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                Compartir Contenido
              </Button>
            </>
          ) : (
            <p className="text-sm text-gray-500">
              El profesor seleccionará el contenido de la clase en breve. Por favor espera un momento.
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <ClassroomSyncContext.Provider value={syncContextValue}>
      <div className="w-full h-full">
        <LessonContent lesson={lessonData} isTeacher={isTeacher} isClassroom={true} />
        {/* Panel for teachers to see student responses in real-time */}
        {isTeacher && <StudentResponsesPanel />}
      </div>
    </ClassroomSyncContext.Provider>
  )
}
