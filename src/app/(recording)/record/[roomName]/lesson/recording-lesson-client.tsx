'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LessonContent } from '@/components/lessons/lesson-content'
import type { LessonForView } from '@/types/lesson'
import { ClassroomSyncContext } from '@/components/classroom/use-classroom-sync'
import type { BlockNavigationState } from '@/components/classroom/collaboration-context'

type LessonMessage = {
  source?: string
  type?: string
  token?: string
  contentId?: string
  contentType?: 'lesson' | 'student_lesson' | 'library_resource'
  version?: number
  blockId?: string
  currentStep?: number
  totalSteps?: number
  hasStarted?: boolean
  isCompleted?: boolean
  currentAnswers?: Record<string, string>
  participantName?: string
  progress?: number
  isPlaying?: boolean
  currentTime?: number
  mediaType?: 'audio' | 'video'
  mediaIndex?: number
  playbackRate?: number
  visible?: boolean
}

interface RecordingLessonClientProps {
  roomName: string
}

export default function RecordingLessonClient({ roomName }: RecordingLessonClientProps) {
  const [lesson, setLesson] = useState<LessonForView | null>(null)
  const [status, setStatus] = useState<'empty' | 'loading' | 'error'>('empty')
  const requestVersionRef = useRef(0)
  const abortControllerRef = useRef<AbortController | null>(null)
  const lessonRootRef = useRef<HTMLElement | null>(null)
  const pendingScrollProgressRef = useRef<number | null>(null)
  const pendingBlockRef = useRef<string | null>(null)
  const pendingMediaRef = useRef(new Map<string, LessonMessage>())
  const [remoteBlockNavigation, setRemoteBlockNavigation] = useState<Map<string, BlockNavigationState>>(
    () => new Map()
  )

  const classroomSyncValue = useMemo(() => ({
    sendBlockResponse: () => undefined,
    syncBlockNavigation: () => undefined,
    remoteBlockNavigation,
    isInClassroom: true,
    isTeacher: true,
  }), [remoteBlockNavigation])

  const applyMedia = useCallback(() => {
    const blocks = lessonRootRef.current?.querySelectorAll('[data-block-id]') || []
    pendingMediaRef.current.forEach(message => {
      for (const block of blocks) {
        if (block.getAttribute('data-block-id') !== message.blockId) continue
        const media = block.querySelectorAll<HTMLMediaElement>(message.mediaType === 'video' ? 'video' : 'audio')[message.mediaIndex || 0]
        if (!media) continue
        if (typeof message.currentTime === 'number' && Number.isFinite(message.currentTime)) media.currentTime = Math.max(0, message.currentTime)
        if (typeof message.playbackRate === 'number' && Number.isFinite(message.playbackRate) && message.playbackRate > 0) media.playbackRate = Math.min(16, message.playbackRate)
        if (message.isPlaying) void media.play().catch(() => undefined)
        else media.pause()
      }
    })
  }, [])

  useEffect(() => {
    if (!lesson) return
    const frame = window.requestAnimationFrame(() => {
      const root = lessonRootRef.current
      if (!root) return
      if (pendingBlockRef.current) {
        Array.from(root.querySelectorAll('[data-block-id]')).find(block => block.getAttribute('data-block-id') === pendingBlockRef.current)?.scrollIntoView({ block: 'center' })
      } else if (pendingScrollProgressRef.current !== null) {
        root.scrollTop = pendingScrollProgressRef.current * Math.max(0, root.scrollHeight - root.clientHeight)
      }
      applyMedia()
    })
    return () => window.cancelAnimationFrame(frame)
  }, [lesson, applyMedia])

  useEffect(() => {
    const handleMessage = (event: MessageEvent<LessonMessage>) => {
      if (event.origin !== window.location.origin || event.source !== window.parent) return
      const message = event.data
      if (!message || message.source !== 'lingowow-recorder') return

      if (message.type === 'set-visible' && message.visible === false) {
        pendingMediaRef.current.forEach(media => { media.isPlaying = false })
        lessonRootRef.current?.querySelectorAll<HTMLMediaElement>('audio,video').forEach(media => media.pause())
        return
      }

      if (message.type === 'clear-lesson') {
        requestVersionRef.current += 1
        abortControllerRef.current?.abort()
        abortControllerRef.current = null
        pendingScrollProgressRef.current = null
        pendingBlockRef.current = null
        pendingMediaRef.current.clear()
        setRemoteBlockNavigation(new Map())
        setLesson(null)
        setStatus('empty')
        return
      }

      if (message.type === 'set-lesson') {
        if (!message.token || !message.contentId || !message.contentType) return
        const requestVersion = ++requestVersionRef.current
        abortControllerRef.current?.abort()
        const controller = new AbortController()
        abortControllerRef.current = controller
        pendingScrollProgressRef.current = null
        pendingBlockRef.current = null
        pendingMediaRef.current.clear()
        setRemoteBlockNavigation(new Map())
        setLesson(null)
        setStatus('loading')

        const query = new URLSearchParams({
          contentId: message.contentId,
          contentType: message.contentType,
        })

        fetch('/api/livekit/egress-recorder/content?' + query.toString(), {
          headers: { Authorization: 'Bearer ' + message.token },
          cache: 'no-store',
          signal: controller.signal,
        })
          .then(async (response) => {
            if (!response.ok) throw new Error('content request failed: ' + response.status)
            return response.json() as Promise<LessonForView>
          })
          .then((nextLesson) => {
            if (requestVersion !== requestVersionRef.current) return
            setLesson(nextLesson)
            setStatus('empty')
          })
          .catch((error: unknown) => {
            if (requestVersion !== requestVersionRef.current) return
            if (error instanceof DOMException && error.name === 'AbortError') return
            console.error('[Recording lesson] Failed to load content:', error)
            setStatus('error')
          })
        return
      }

      if (message.type === 'block-navigation' && message.blockId) {
        const currentStep = Number(message.currentStep)
        const totalSteps = Number(message.totalSteps)
        if (!Number.isFinite(currentStep) || !Number.isFinite(totalSteps)) return
        pendingBlockRef.current = message.blockId
        setRemoteBlockNavigation((previous) => {
          const next = new Map(previous)
          next.set(message.blockId!, {
            blockId: message.blockId!,
            currentStep: Math.max(0, Math.floor(currentStep)),
            totalSteps: Math.max(0, Math.floor(totalSteps)),
            hasStarted: message.hasStarted === true,
            isCompleted: message.isCompleted === true,
            currentAnswers: message.currentAnswers,
            participantName: message.participantName || 'Student',
            timestamp: Date.now(),
          })
          return next
        })

        const blocks = lessonRootRef.current?.querySelectorAll('[data-block-id]') || []
        for (const block of blocks) {
          if (block.getAttribute('data-block-id') === message.blockId) {
            block.scrollIntoView({ behavior: 'auto', block: 'center' })
            break
          }
        }
        return
      }

      if (message.type === 'scroll-progress' && typeof message.progress === 'number' && Number.isFinite(message.progress)) {
        pendingBlockRef.current = null
        pendingScrollProgressRef.current = Math.max(0, Math.min(1, message.progress))
        const root = lessonRootRef.current
        if (root) {
          const maxScroll = root.scrollHeight - root.clientHeight
          root.scrollTop = Math.max(0, Math.min(1, message.progress)) * Math.max(0, maxScroll)
        }
        return
      }

      if (message.type === 'audio-sync' && message.blockId) {
        const index = Number.isInteger(message.mediaIndex) ? Math.max(0, message.mediaIndex!) : 0
        pendingMediaRef.current.set(message.blockId + ':' + message.mediaType + ':' + index, { ...message, mediaIndex: index })
        applyMedia()
      }
    }

    window.addEventListener('message', handleMessage)
    window.parent.postMessage({ source: 'lingowow-recorder', type: 'lesson-frame-ready' }, window.location.origin)
    return () => {
      window.removeEventListener('message', handleMessage)
      abortControllerRef.current?.abort()
    }
  }, [applyMedia])

  return (
    <main
      ref={(element) => {
        lessonRootRef.current = element
      }}
      data-recording-room={roomName}
      onLoadedMetadataCapture={applyMedia}
      style={{
        width: '100%',
        height: '100vh',
        overflowY: 'auto',
        background: '#ffffff',
        color: '#0f172a',
        padding: '28px 42px 64px',
      }}
    >
      {status === 'loading' && <div style={{ minHeight: 180, display: 'grid', placeItems: 'center', color: '#64748b' }}>Cargando contenido...</div>}
      {status === 'error' && <div style={{ minHeight: 180, display: 'grid', placeItems: 'center', color: '#b91c1c' }}>No se pudo cargar el contenido de la lección.</div>}
      {status === 'empty' && !lesson && <div style={{ minHeight: 180, display: 'grid', placeItems: 'center', color: '#64748b' }}>Esperando contenido de la lección...</div>}
      {lesson && (
        <ClassroomSyncContext.Provider value={classroomSyncValue}>
          <LessonContent lesson={lesson} isTeacher isClassroom />
        </ClassroomSyncContext.Provider>
      )}
    </main>
  )
}
