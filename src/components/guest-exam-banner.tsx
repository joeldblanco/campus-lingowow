'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ClipboardCheck, X } from 'lucide-react'
import { getPendingExamsForGuest } from '@/lib/actions/exams'

interface PendingExam {
  id: string
  title: string
  slug: string | null
  timeLimit: number | null
  dueDate: Date | null
}

interface GuestExamBannerProps {
  userId: string
}

export function GuestExamBanner({ userId }: GuestExamBannerProps) {
  const [pendingExam, setPendingExam] = useState<PendingExam | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    async function fetchPendingExams() {
      const result = await getPendingExamsForGuest(userId)
      if (result.success && result.exams.length > 0) {
        setPendingExam(result.exams[0])
      }
    }
    fetchPendingExams()
  }, [userId])

  if (!pendingExam || dismissed) {
    return null
  }

  const examUrl = pendingExam.slug
    ? `/test/${pendingExam.slug}`
    : `/exams/${pendingExam.id}/take`

  return (
    <div className="w-full bg-primary text-primary-foreground border-b">
      <div className="flex items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="bg-primary-foreground/10 p-2 rounded-full hidden sm:block">
            <ClipboardCheck className="h-5 w-5 shrink-0" />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
            <p className="text-sm font-semibold">Examen Asignado</p>
            <span className="hidden sm:block text-primary-foreground/40 text-xs">•</span>
            <p className="text-sm">
              <strong>{pendingExam.title}</strong>
              {pendingExam.dueDate && (
                <span className="ml-2 text-primary-foreground/80 text-xs">
                  (Vence: {new Date(pendingExam.dueDate).toLocaleDateString()})
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            asChild
            size="sm"
            variant="secondary"
            className="font-semibold shadow-sm"
          >
            <Link href={examUrl}>Tomar Examen</Link>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 rounded-full hover:bg-primary-foreground/20 transition-colors"
            onClick={() => setDismissed(true)}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Cerrar</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
