'use client'

import { LessonContent } from '@/components/lessons/lesson-content'
import { LessonForView } from '@/types/lesson'
import { Loader2 } from 'lucide-react'

interface ActiveLessonViewerProps {
  lessonId?: string
  lessonData?: LessonForView
  isLoading?: boolean
  isTeacher?: boolean
}

export function ActiveLessonViewer({ lessonData, isLoading, isTeacher }: ActiveLessonViewerProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400">
        <Loader2 className="w-10 h-10 animate-spin mb-4 text-blue-500" />
        <p>Cargando lección...</p>
      </div>
    )
  }

  if (!lessonData) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 bg-white/50 rounded-xl border border-dashed border-gray-300">
        <div className="text-center max-w-sm px-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Bienvenido al Aula</h3>
          <p className="text-sm text-gray-500">
            El profesor seleccionará el contenido de la clase en breve. Por favor espera un momento.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-full">
      {/* We reuse the existing LessonContent component which handles displaying blocks */}
      <LessonContent lesson={lessonData} isTeacher={isTeacher} />
    </div>
  )
}
