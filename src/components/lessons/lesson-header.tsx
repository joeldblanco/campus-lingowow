'use client'

import { CheckCircle, ChevronRight, X } from 'lucide-react'
import Link from 'next/link'

interface LessonHeaderProps {
  title: string
  subtitle?: string | null
  courseTitle: string
  moduleTitle: string
  courseId: string
  progress: number
  backUrl?: string
  guidedAppearance?: boolean
}

export function LessonHeader({
  title,
  subtitle,
  courseTitle,
  moduleTitle,
  courseId,
  progress,
  backUrl,
  guidedAppearance = false,
}: LessonHeaderProps) {
  return (
    <div className={guidedAppearance ? 'sticky top-0 z-50 border-b border-[#eee8fa] bg-[#faf8f4] text-[#10245c]' : 'bg-white border-b sticky top-0 z-50'}>
      <div className={guidedAppearance ? 'mx-auto flex h-11 max-w-7xl items-center justify-between px-4 sm:px-6' : 'container mx-auto px-4 h-16 flex items-center justify-between'}>
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <Link
            href={backUrl ?? `/my-courses/${courseId}`}
            aria-label="Volver al curso"
            className={guidedAppearance ? 'flex min-h-11 min-w-11 items-center justify-center rounded-full text-[#506187] hover:bg-[#eee8fa] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#10245c]' : 'text-gray-500 hover:text-gray-900'}
          >
            <X className="w-6 h-6" aria-hidden="true" />
          </Link>

          <div className="flex flex-col min-w-0">
            {!guidedAppearance && (
              <nav aria-label="Ubicación de la lección" className="flex items-center gap-1 text-xs text-gray-500 mb-0.5">
                <span>{courseTitle}</span>
                <ChevronRight className="w-3 h-3 shrink-0" aria-hidden="true" />
                <span>{moduleTitle}</span>
              </nav>
            )}
            <h1 className={guidedAppearance ? 'max-w-xl truncate text-sm font-semibold leading-6 text-[#10245c]' : 'text-lg font-bold text-gray-900 leading-none truncate max-w-xl'}>
              {title}
            </h1>
          </div>
        </div>

        {progress >= 100 && (
          <span
            role="status"
            className={guidedAppearance ? 'ml-3 inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white px-3 py-1 text-sm font-medium text-[#08775e]' : 'ml-3 inline-flex shrink-0 items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 sm:text-sm'}
          >
            <CheckCircle className="h-4 w-4" aria-hidden="true" />
            <span className={guidedAppearance ? 'sr-only sm:not-sr-only' : undefined}>Lección completada</span>
          </span>
        )}
      </div>

      {subtitle && !guidedAppearance && (
        <div className="bg-gray-50 border-b py-4">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
            <p className="text-gray-600">{subtitle}</p>
          </div>
        </div>
      )}
    </div>
  )
}
