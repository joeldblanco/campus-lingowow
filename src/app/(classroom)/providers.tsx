'use client'

import { SessionProvider } from 'next-auth/react'
import { SessionTimeoutProvider } from '@/components/session-timeout-provider'
import { type ReactNode } from 'react'

export function ClassroomProviders({ children }: { children: ReactNode }) {
  return (
    <SessionProvider refetchOnWindowFocus={false}>
      <SessionTimeoutProvider>{children}</SessionTimeoutProvider>
    </SessionProvider>
  )
}
