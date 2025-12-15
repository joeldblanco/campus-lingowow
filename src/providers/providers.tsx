'use client'

import { SidebarProvider } from '@/components/ui/sidebar'
import { SessionProvider } from 'next-auth/react'
import { SessionTimeoutProvider } from '@/components/session-timeout-provider'
import { type ReactNode } from 'react'

export function Providers({
  children,
  defaultOpen,
}: {
  children: ReactNode
  defaultOpen?: boolean
}) {
  return (
    <SessionProvider>
      <SessionTimeoutProvider>
        <SidebarProvider defaultOpen={defaultOpen}>{children}</SidebarProvider>
      </SessionTimeoutProvider>
    </SessionProvider>
  )
}
