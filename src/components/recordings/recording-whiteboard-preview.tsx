'use client'

import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'

const ExcalidrawWrapper = dynamic(() => import('@/components/classroom/excalidraw-wrapper'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-white">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
    </div>
  ),
})

interface RecordingWhiteboardPreviewProps {
  elements: unknown[]
}

export function RecordingWhiteboardPreview({ elements }: RecordingWhiteboardPreviewProps) {
  return (
    <div className="h-full min-h-[420px] overflow-hidden rounded-lg border bg-white">
      <ExcalidrawWrapper
        initialData={{
          elements,
          appState: {
            viewBackgroundColor: '#ffffff',
          },
        }}
        langCode="es-ES"
        theme="light"
        viewModeEnabled
      />
    </div>
  )
}
