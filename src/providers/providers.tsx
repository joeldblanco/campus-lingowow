'use client'

import { SidebarProvider } from '@/components/ui/sidebar'
import { SessionProvider } from 'next-auth/react'
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
      <SidebarProvider defaultOpen={defaultOpen}>{children}</SidebarProvider>
    </SessionProvider>
  )
}
