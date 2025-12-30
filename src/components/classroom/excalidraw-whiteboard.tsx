'use client'

import React, { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { Save, Loader2 } from 'lucide-react'
import { saveWhiteboardData, getWhiteboardData } from '@/lib/actions/classroom-whiteboard'
import { toast } from 'sonner'

// Dynamic import for Excalidraw (client-side only)
const Excalidraw = dynamic(
  async () => (await import('@excalidraw/excalidraw')).Excalidraw,
  { ssr: false, loading: () => <div className="h-full flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div> }
)

interface ExcalidrawWhiteboardProps {
  bookingId?: string
}

export function ExcalidrawWhiteboard({ bookingId }: ExcalidrawWhiteboardProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [initialData, setInitialData] = useState<any[] | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null)

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
      {/* Save Button */}
      {bookingId && (
        <div className="flex-none p-2 border-b bg-gray-50 flex justify-end z-10">
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
      <div className="flex-1 min-h-0">
        <Excalidraw
          excalidrawAPI={(api) => setExcalidrawAPI(api)}
          initialData={{
            elements: initialData || [],
            appState: {
              viewBackgroundColor: '#ffffff',
            },
          }}
          langCode="es-ES"
          theme="light"
        />
      </div>
    </div>
  )
}
