'use client'

import { useEffect, type RefObject } from 'react'
import { useLiveKit } from './livekit-context'

export function useRecorderMedia(containerRef: RefObject<HTMLElement | null>, isTeacher: boolean) {
  const { sendCommand, addCommandListener, removeCommandListener, connectionStatus } = useLiveKit()
  useEffect(() => {
    if (connectionStatus !== 'connected') return
    const publish = (media: HTMLMediaElement) => {
      const container = containerRef.current
      const block = media.closest('[data-block-id]')
      if (!container?.contains(media) || !block) return
      const kind = media.tagName.toLowerCase()
      const mediaIndex = Array.from(block.querySelectorAll(kind)).indexOf(media)
      sendCommand('audio-sync', {
        type: media.paused ? 'AUDIO_PAUSE' : 'AUDIO_PLAY',
        blockId: block.getAttribute('data-block-id'),
        mediaType: kind,
        mediaIndex,
        currentTime: media.currentTime,
        playbackRate: media.playbackRate,
      })
    }
    const onMedia = (event: Event) => {
      if (event.target instanceof HTMLMediaElement) publish(event.target)
    }
    const onSync = (data: Record<string, unknown>) => {
      if (!isTeacher || data.type !== 'REQUEST_SYNC') return
      containerRef.current?.querySelectorAll<HTMLMediaElement>('audio,video').forEach(publish)
    }
    const events = ['play', 'pause', 'seeked', 'ratechange', 'ended']
    events.forEach(event => document.addEventListener(event, onMedia, true))
    addCommandListener('sync-request', onSync)
    return () => {
      events.forEach(event => document.removeEventListener(event, onMedia, true))
      removeCommandListener('sync-request', onSync)
    }
  }, [containerRef, isTeacher, connectionStatus, sendCommand, addCommandListener, removeCommandListener])
}
