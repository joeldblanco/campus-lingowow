'use client'

import { useEffect, type RefObject } from 'react'
import { useLiveKit } from './livekit-context'

/** Mirror the teacher's viewport without changing the student's scroll position. */
export function useRecorderScroll(containerRef: RefObject<HTMLElement | null>, isTeacher: boolean) {
  const { sendCommand, addCommandListener, removeCommandListener, connectionStatus } = useLiveKit()
  useEffect(() => {
    if (!isTeacher || connectionStatus !== 'connected') return
    let pending: ReturnType<typeof setTimeout> | undefined
    let scrollTarget: HTMLElement | null = null
    const findScroller = () => {
      let current = containerRef.current
      while (current) {
        if (current.scrollHeight > current.clientHeight && /auto|scroll/.test(getComputedStyle(current).overflowY)) return current
        current = current.parentElement
      }
      return document.scrollingElement as HTMLElement | null
    }
    const publish = () => {
      const target = scrollTarget?.isConnected ? scrollTarget : findScroller()
      if (!target) return
      const range = target.scrollHeight - target.clientHeight
      sendCommand('lesson-scroll', {
        type: 'LESSON_SCROLL',
        progress: range > 0 ? Math.max(0, Math.min(1, target.scrollTop / range)) : 0,
      })
    }
    const onScroll = (event: Event) => {
      const target = event.target === document ? document.scrollingElement : event.target
      const container = containerRef.current
      // Ignore nested exercises and unrelated sidebars; mirror the lesson's viewport.
      if (!(target instanceof HTMLElement) || !container || !target.contains(container)) return
      scrollTarget = target
      if (pending) return
      pending = setTimeout(() => { pending = undefined; publish() }, 100)
    }
    const onSync = (data: Record<string, unknown>) => {
      if (data.type === 'REQUEST_SYNC') publish()
    }
    document.addEventListener('scroll', onScroll, { capture: true, passive: true })
    addCommandListener('sync-request', onSync)
    return () => {
      document.removeEventListener('scroll', onScroll, true)
      removeCommandListener('sync-request', onSync)
      if (pending) clearTimeout(pending)
    }
  }, [containerRef, isTeacher, connectionStatus, sendCommand, addCommandListener, removeCommandListener])
}
