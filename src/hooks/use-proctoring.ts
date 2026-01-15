'use client'

import { useEffect, useCallback, useState, useRef } from 'react'
import { recordProctorEvent, ProctorEventType } from '@/lib/actions/proctoring'

interface UseProctoringOptions {
  attemptId: string
  enabled?: boolean
  requireFullscreen?: boolean
  blockCopyPaste?: boolean
  blockRightClick?: boolean
  onViolation?: (eventType: ProctorEventType, count: number) => void
  maxWarnings?: number
  onMaxWarningsReached?: () => void
}

interface ProctoringState {
  isFullscreen: boolean
  violationCount: number
  warningCount: number
  criticalCount: number
  isActive: boolean
}

export function useProctoring({
  attemptId,
  enabled = true,
  requireFullscreen = true,
  blockCopyPaste = true,
  blockRightClick = true,
  onViolation,
  maxWarnings = 5,
  onMaxWarningsReached
}: UseProctoringOptions) {
  const [state, setState] = useState<ProctoringState>({
    isFullscreen: false,
    violationCount: 0,
    warningCount: 0,
    criticalCount: 0,
    isActive: false
  })

  const violationCountRef = useRef(0)
  const hasStartedRef = useRef(false)

  const logEvent = useCallback(async (eventType: ProctorEventType, metadata?: Record<string, unknown>) => {
    if (!enabled) return

    await recordProctorEvent(attemptId, eventType, metadata)

    const isCritical = ['copy_attempt', 'paste_attempt'].includes(eventType)
    const isWarning = ['tab_switch', 'fullscreen_exit', 'window_blur', 'right_click'].includes(eventType)

    if (isWarning || isCritical) {
      violationCountRef.current += 1
      setState(prev => ({
        ...prev,
        violationCount: prev.violationCount + 1,
        warningCount: isWarning ? prev.warningCount + 1 : prev.warningCount,
        criticalCount: isCritical ? prev.criticalCount + 1 : prev.criticalCount
      }))

      onViolation?.(eventType, violationCountRef.current)

      if (violationCountRef.current >= maxWarnings) {
        onMaxWarningsReached?.()
      }
    }
  }, [attemptId, enabled, onViolation, maxWarnings, onMaxWarningsReached])

  const enterFullscreen = useCallback(async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen()
      }
    } catch (error) {
      // Silenciar errores de permisos - el navegador puede bloquear fullscreen
      // si no hay interacción del usuario o si el usuario lo rechaza
      if (error instanceof Error && !error.message.includes('permissions')) {
        console.error('Error entering fullscreen:', error)
      }
    }
  }, [])

  const exitFullscreen = useCallback(async () => {
    try {
      if (document.exitFullscreen && document.fullscreenElement) {
        await document.exitFullscreen()
      }
    } catch (error) {
      console.error('Error exiting fullscreen:', error)
    }
  }, [])

  useEffect(() => {
    if (!enabled) return

    const handleVisibilityChange = () => {
      if (document.hidden) {
        logEvent('tab_switch', { timestamp: new Date().toISOString() })
      }
    }

    const handleFullscreenChange = () => {
      const isNowFullscreen = !!document.fullscreenElement
      setState(prev => ({ ...prev, isFullscreen: isNowFullscreen }))

      if (!isNowFullscreen && hasStartedRef.current && requireFullscreen) {
        logEvent('fullscreen_exit', { timestamp: new Date().toISOString() })
      } else if (isNowFullscreen) {
        logEvent('fullscreen_enter', { timestamp: new Date().toISOString() })
      }
    }

    const handleWindowBlur = () => {
      logEvent('window_blur', { timestamp: new Date().toISOString() })
    }

    const handleWindowFocus = () => {
      logEvent('window_focus', { timestamp: new Date().toISOString() })
    }

    const handleCopy = (e: ClipboardEvent) => {
      if (blockCopyPaste) {
        e.preventDefault()
        logEvent('copy_attempt', { timestamp: new Date().toISOString() })
      }
    }

    const handlePaste = (e: ClipboardEvent) => {
      if (blockCopyPaste) {
        e.preventDefault()
        logEvent('paste_attempt', { timestamp: new Date().toISOString() })
      }
    }

    const handleContextMenu = (e: MouseEvent) => {
      if (blockRightClick) {
        e.preventDefault()
        logEvent('right_click', { timestamp: new Date().toISOString() })
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (blockCopyPaste) {
        if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'v' || e.key === 'x')) {
          e.preventDefault()
          if (e.key === 'c' || e.key === 'x') {
            logEvent('copy_attempt', { key: e.key, timestamp: new Date().toISOString() })
          } else {
            logEvent('paste_attempt', { key: e.key, timestamp: new Date().toISOString() })
          }
        }
      }

      if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I')) {
        e.preventDefault()
        logEvent('copy_attempt', { key: 'devtools', timestamp: new Date().toISOString() })
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    window.addEventListener('blur', handleWindowBlur)
    window.addEventListener('focus', handleWindowFocus)
    document.addEventListener('copy', handleCopy)
    document.addEventListener('paste', handlePaste)
    document.addEventListener('cut', handleCopy)
    document.addEventListener('contextmenu', handleContextMenu)
    document.addEventListener('keydown', handleKeyDown)

    if (!hasStartedRef.current) {
      hasStartedRef.current = true
      setState(prev => ({ ...prev, isActive: true }))
      logEvent('exam_start', { timestamp: new Date().toISOString() })
      
      if (requireFullscreen) {
        enterFullscreen()
      }
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      window.removeEventListener('blur', handleWindowBlur)
      window.removeEventListener('focus', handleWindowFocus)
      document.removeEventListener('copy', handleCopy)
      document.removeEventListener('paste', handlePaste)
      document.removeEventListener('cut', handleCopy)
      document.removeEventListener('contextmenu', handleContextMenu)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [enabled, requireFullscreen, blockCopyPaste, blockRightClick, logEvent, enterFullscreen])

  const endProctoring = useCallback(async () => {
    await logEvent('exam_submit', { 
      totalViolations: violationCountRef.current,
      timestamp: new Date().toISOString() 
    })
    setState(prev => ({ ...prev, isActive: false }))
    if (document.fullscreenElement) {
      await exitFullscreen()
    }
  }, [logEvent, exitFullscreen])

  return {
    ...state,
    enterFullscreen,
    exitFullscreen,
    endProctoring,
    logEvent
  }
}
