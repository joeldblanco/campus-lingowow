'use client'

import { ExamFocusProvider, ExamChrome } from '@/components/exams/student/exam-focus'
import { SidebarProvider } from '@/components/ui/sidebar'
import { SessionProvider } from 'next-auth/react'
import { SessionTimeoutProvider } from '@/components/session-timeout-provider'
import { TourProvider, GuidedTour, TourAutoStart } from '@/components/tour'
import { type ReactNode } from 'react'

export function Providers({
  children,
  defaultOpen,
}: {
  children: ReactNode
  defaultOpen?: boolean
}) {
  return (
    <SessionProvider refetchOnWindowFocus={false}>
      <SessionTimeoutProvider>
        <ExamFocusProvider>
        <TourProvider>
          <SidebarProvider defaultOpen={defaultOpen}>{children}</SidebarProvider>
          <ExamChrome><GuidedTour /></ExamChrome>
          <ExamChrome><TourAutoStart /></ExamChrome>
        </TourProvider>
        </ExamFocusProvider>
      </SessionTimeoutProvider>
    </SessionProvider>
  )
}
