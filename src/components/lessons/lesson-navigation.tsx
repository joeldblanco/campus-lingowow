'use client'

import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react'
import Link from 'next/link'

interface LessonNavigationProps {
  prevLessonId: string | null
  nextLessonId: string | null
  onComplete?: () => void
  disableComplete?: boolean
  isCompleted?: boolean
  isPending?: boolean
}

export function LessonNavigation({
  prevLessonId,
  nextLessonId,
  onComplete,
  disableComplete,
  isCompleted,
  isPending,
}: LessonNavigationProps) {
  const actionLabel = isPending
    ? 'Guardando...'
    : nextLessonId
      ? isCompleted
        ? 'Siguiente Lección'
        : 'Completar y continuar'
      : isCompleted
        ? 'Volver al curso'
        : 'Completar Lección'

  return (
    <div className="border-t bg-white p-4 shadow-sm rounded-lg mt-8 sticky bottom-4">
      <div className="flex items-center justify-between">
        <div>
          {prevLessonId ? (
            <Button variant="outline" asChild>
              <Link href={`./${prevLessonId}`}>
                <ChevronLeft className="w-4 h-4 mr-2" />
                Lección Anterior
              </Link>
            </Button>
          ) : (
            <Button variant="ghost" disabled>
              Lección Anterior
            </Button>
          )}
        </div>

        <div className="flex gap-2">
          {/* Skip button removed */}

          <Button
            type="button"
            className={!nextLessonId ? 'bg-green-600 hover:bg-green-700' : undefined}
            onClick={onComplete}
            disabled={disableComplete || isPending}
          >
            {actionLabel}
            {nextLessonId ? (
              <ChevronRight className="w-4 h-4 ml-2" />
            ) : (
              <CheckCircle className="w-4 h-4 ml-2" />
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
