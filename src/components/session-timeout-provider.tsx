'use client'

import { useEffect, useCallback, useRef } from 'react'
import { signOut, useSession } from 'next-auth/react'
import { toast } from 'sonner'

const INACTIVITY_TIMEOUT = 7 * 24 * 60 * 60 * 1000 // 7 días
const WARNING_BEFORE_TIMEOUT = 60 * 60 * 1000 // 1 hora de advertencia

export function SessionTimeoutProvider({ children }: { children: React.ReactNode }) {
  const { status } = useSession()
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const warningRef = useRef<NodeJS.Timeout | null>(null)
  const warningShownRef = useRef(false)

  const handleLogout = useCallback(async () => {
    toast.error('Tu sesión ha expirado por inactividad')
    await signOut({ callbackUrl: '/auth/login' })
  }, [])

  const resetTimer = useCallback(() => {
    warningShownRef.current = false
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    if (warningRef.current) {
      clearTimeout(warningRef.current)
    }

    if (status === 'authenticated') {
      warningRef.current = setTimeout(() => {
        if (!warningShownRef.current) {
          warningShownRef.current = true
          toast.warning('Tu sesión expirará en 1 hora por inactividad', {
            duration: 10000,
          })
        }
      }, INACTIVITY_TIMEOUT - WARNING_BEFORE_TIMEOUT)
      timeoutRef.current = setTimeout(handleLogout, INACTIVITY_TIMEOUT)
    }
  }, [status, handleLogout])

  useEffect(() => {
    if (status !== 'authenticated') return

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove']
    
    const handleActivity = () => {
      resetTimer()
    }

    events.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true })
    })

    resetTimer()

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity)
      })
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (warningRef.current) clearTimeout(warningRef.current)
    }
  }, [status, resetTimer])

  return <>{children}</>
}
