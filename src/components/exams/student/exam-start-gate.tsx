'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { loadExamTakingSession } from '@/lib/actions/exam-entry'
import { ExamTakingClient } from '@/app/(private)/exams/[examId]/take/exam-taking-client'
import { ExamEntryDialog } from './exam-entry-dialog'
import { useExamFocus } from './exam-focus'

type Session = Exclude<Awaited<ReturnType<typeof loadExamTakingSession>>, { redirectUrl: string }>

export function ExamStartGate({ examId, title, proctoring, cancelUrl }: {
  examId: string
  title: string
  proctoring: Session['proctoring']
  cancelUrl: string
}) {
  const router = useRouter()
  const [session, setSession] = useState<Session | null>(null)
  const hasSessionRef = useRef(false)
  const { setActive } = useExamFocus()
  useEffect(() => () => {
    setActive(false)
    if (hasSessionRef.current && document.fullscreenElement) void document.exitFullscreen?.().catch(() => {})
  }, [setActive])
  if (session) return <ExamTakingClient {...session} />
  return <ExamEntryDialog title={title} proctoring={proctoring} onCancel={() => router.replace(cancelUrl)} onEnter={async () => {
    if (!document.fullscreenElement) throw new Error('Entra en pantalla completa para iniciar la evaluación.')
    const next = await loadExamTakingSession(examId)
    if ('redirectUrl' in next) {
      if (document.fullscreenElement) await document.exitFullscreen?.()
      router.replace(next.redirectUrl)
      return
    }
    if (!document.fullscreenElement) throw new Error('Vuelve a entrar en pantalla completa para iniciar la evaluación.')
    hasSessionRef.current = true
    setSession(next)
    setActive(true)
  }} />
}
