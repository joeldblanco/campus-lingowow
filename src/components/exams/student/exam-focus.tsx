'use client'

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { SidebarInset } from '@/components/ui/sidebar'

const ExamFocusContext = createContext({ active: false, setActive: (_active: boolean) => { void _active } })

export function ExamFocusProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [active, setActive] = useState(false)
  useEffect(() => { setActive(false) }, [pathname])
  const value = useMemo(() => ({ active, setActive }), [active])
  return <ExamFocusContext.Provider value={value}>{children}</ExamFocusContext.Provider>
}

export const useExamFocus = () => useContext(ExamFocusContext)

export function ExamChrome({ children }: { children: ReactNode }) {
  return useExamFocus().active ? null : children
}

export function ExamMain({ children }: { children: ReactNode }) {
  const { active } = useExamFocus()
  return <SidebarInset className={active ? 'm-0 min-h-svh rounded-none shadow-none md:!m-0 md:!rounded-none' : undefined}>{children}</SidebarInset>
}

export function ExamContentArea({ children }: { children: ReactNode }) {
  const { active } = useExamFocus()
  return <div className={active ? 'flex min-h-svh flex-1 flex-col' : 'flex flex-1 flex-col gap-4 p-4 pt-0'}>{children}</div>
}
