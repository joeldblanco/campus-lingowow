'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { Save, Loader2, Users } from 'lucide-react'
import { saveWhiteboardData, getWhiteboardData } from '@/lib/actions/classroom-whiteboard'
import { toast } from 'sonner'
import { useLiveKit } from './livekit-context'

// Dynamic import for the Excalidraw wrapper (client-side only)
const ExcalidrawWrapper = dynamic(
  () => import('./excalidraw-wrapper'),
  { ssr: false, loading: () => <div className="h-full flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div> }
)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExcalidrawElement = any

interface ExcalidrawWhiteboardProps {
  bookingId?: string
  isTeacher?: boolean
}

export function ExcalidrawWhiteboard({ bookingId, isTeacher = false }: ExcalidrawWhiteboardProps) {
  const { sendCommand, addCommandListener, removeCommandListener, connectionStatus } = useLiveKit()
  
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isCollaborating, setIsCollaborating] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [initialData, setInitialData] = useState<any[] | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null)
  
  const lastSyncRef = useRef<number>(0)
  const lastReceivedRef = useRef<number>(0)
  const syncThrottleRef = useRef<NodeJS.Timeout | null>(null)
  const collaboratingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastElementsRef = useRef<Map<string, number>>(new Map()) // id -> version
  const isProcessingRemoteRef = useRef(false)

  // Load saved data
  useEffect(() => {
    const loadData = async () => {
      if (!bookingId) {
        setIsLoading(false)
        return
      }
      try {
        const data = await getWhiteboardData(bookingId)
        if (data && Array.isArray(data) && data.length > 0) {
          setInitialData(data)
        }
      } catch (error) {
        console.error('Error loading whiteboard:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [bookingId])

  // Merge remote elements with local elements intelligently
  const mergeElements = useCallback((remoteElements: ExcalidrawElement[]): ExcalidrawElement[] => {
    if (!excalidrawAPI) return remoteElements
    
    // If remote is empty, it means the whiteboard was cleared - replace completely
    if (remoteElements.length === 0) {
      return []
    }
    
    const localElements = excalidrawAPI.getSceneElements() as ExcalidrawElement[]
    const elementMap = new Map<string, ExcalidrawElement>()
    
    // Create a set of remote element IDs for deletion detection
    const remoteIds = new Set(remoteElements.map((el: ExcalidrawElement) => el.id))
    
    // Add local elements only if they exist in remote (to handle deletions)
    localElements.forEach((el: ExcalidrawElement) => {
      if (remoteIds.has(el.id)) {
        elementMap.set(el.id, el)
      }
    })
    
    // Merge remote elements - remote wins if version is higher or equal
    remoteElements.forEach((remoteEl: ExcalidrawElement) => {
      const localEl = elementMap.get(remoteEl.id)
      if (!localEl) {
        // New element from remote
        elementMap.set(remoteEl.id, remoteEl)
      } else {
        // Compare versions - remote wins on tie to ensure consistency
        const localVersion = localEl.version || 0
        const remoteVersion = remoteEl.version || 0
        if (remoteVersion >= localVersion) {
          elementMap.set(remoteEl.id, remoteEl)
        }
      }
    })
    
    return Array.from(elementMap.values())
  }, [excalidrawAPI])

  // Listen for remote whiteboard updates
  useEffect(() => {
    if (connectionStatus !== 'connected') return

    const handleWhiteboardSync = (data: Record<string, unknown>) => {
      if (data.type === 'WHITEBOARD_UPDATE' && excalidrawAPI) {
        // Prevent processing our own updates (check if we sent this recently)
        const now = Date.now()
        if (now - lastSyncRef.current < 50) return
        
        // Mark that we're processing remote update
        isProcessingRemoteRef.current = true
        lastReceivedRef.current = now
        
        const remoteElements = data.elements as ExcalidrawElement[]
        if (remoteElements && Array.isArray(remoteElements)) {
          // Merge instead of replace
          const mergedElements = mergeElements(remoteElements)
          excalidrawAPI.updateScene({ elements: mergedElements })
          
          // Update our version tracking
          mergedElements.forEach((el: ExcalidrawElement) => {
            lastElementsRef.current.set(el.id, el.version || 0)
          })
          
          // Show collaborating indicator with debounce
          setIsCollaborating(true)
          if (collaboratingTimeoutRef.current) {
            clearTimeout(collaboratingTimeoutRef.current)
          }
          collaboratingTimeoutRef.current = setTimeout(() => {
            setIsCollaborating(false)
          }, 3000)
        }
        
        // Reset processing flag after a short delay
        setTimeout(() => {
          isProcessingRemoteRef.current = false
        }, 50)
      }
    }

    addCommandListener('whiteboard-sync', handleWhiteboardSync)
    return () => {
      removeCommandListener('whiteboard-sync', handleWhiteboardSync)
      if (collaboratingTimeoutRef.current) {
        clearTimeout(collaboratingTimeoutRef.current)
      }
    }
  }, [connectionStatus, excalidrawAPI, addCommandListener, removeCommandListener, mergeElements])

  // Send whiteboard updates to remote participants (throttled)
  const syncWhiteboardElements = useCallback(() => {
    if (!excalidrawAPI) return
    
    // Don't send if we're processing a remote update or just received one
    if (isProcessingRemoteRef.current) return
    if (Date.now() - lastReceivedRef.current < 150) return
    
    // Clear existing throttle
    if (syncThrottleRef.current) {
      clearTimeout(syncThrottleRef.current)
    }

    // Throttle to max 4 updates per second for stability
    syncThrottleRef.current = setTimeout(() => {
      const elements = excalidrawAPI.getSceneElements() as ExcalidrawElement[]
      if (!elements || elements.length === 0) return
      
      // Check if anything actually changed
      let hasChanges = false
      for (const el of elements) {
        const lastVersion = lastElementsRef.current.get(el.id)
        if (lastVersion === undefined || el.version > lastVersion) {
          hasChanges = true
          lastElementsRef.current.set(el.id, el.version || 0)
        }
      }
      
      // Also check for deleted elements
      if (lastElementsRef.current.size > elements.length) {
        hasChanges = true
        const currentIds = new Set(elements.map((el: ExcalidrawElement) => el.id))
        lastElementsRef.current.forEach((_, id) => {
          if (!currentIds.has(id)) {
            lastElementsRef.current.delete(id)
          }
        })
      }
      
      if (!hasChanges) return
      
      lastSyncRef.current = Date.now()
      sendCommand('whiteboard-sync', {
        type: 'WHITEBOARD_UPDATE',
        elements,
        participantId: isTeacher ? 'teacher' : 'student',
      })
    }, 250)
  }, [excalidrawAPI, sendCommand, isTeacher])

  // Handle Excalidraw onChange
  const handleChange = useCallback(() => {
    syncWhiteboardElements()
  }, [syncWhiteboardElements])

  const handleSave = useCallback(async () => {
    if (!bookingId || !excalidrawAPI) {
      toast.error('No se puede guardar')
      return
    }

    setIsSaving(true)
    try {
      const elements = excalidrawAPI.getSceneElements()
      const result = await saveWhiteboardData(bookingId, elements)
      if (result.success) {
        toast.success('Pizarra guardada')
      } else {
        toast.error(result.error || 'Error al guardar')
      }
    } catch (error) {
      console.error('Error saving:', error)
      toast.error('Error al guardar pizarra')
    } finally {
      setIsSaving(false)
    }
  }, [bookingId, excalidrawAPI])

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-white rounded-xl">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-white rounded-xl overflow-hidden border">
      {/* Header with Save Button and Collaboration Indicator */}
      {bookingId && (
        <div className="flex-none p-2 border-b bg-gray-50 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            {isCollaborating && (
              <div className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full animate-pulse">
                <Users className="w-3 h-3" />
                <span>Colaborando...</span>
              </div>
            )}
            {connectionStatus === 'connected' && !isCollaborating && (
              <div className="flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                <Users className="w-3 h-3" />
                <span>Pizarra compartida</span>
              </div>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="gap-1"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Guardar
          </Button>
        </div>
      )}

      {/* Excalidraw Canvas */}
      <div className="flex-1 min-h-0 relative" style={{ height: '100%', width: '100%' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
          <ExcalidrawWrapper
            excalidrawAPI={(api) => setExcalidrawAPI(api)}
            initialData={{
              elements: initialData || [],
              appState: {
                viewBackgroundColor: '#ffffff',
              },
            }}
            langCode="es-ES"
            theme="light"
            onChange={handleChange}
          />
        </div>
      </div>
    </div>
  )
}
