'use client'

import { socketClient } from '@/lib/socket'
import { useEffect, useRef } from 'react'

type EventCallback<T = unknown> = (data: T) => void

interface EventBinding {
  event: string
  callback: EventCallback
}

export function useSocketChannel(
  channelName: string | null,
  events: EventBinding[]
) {
  const eventsRef = useRef(events)
  eventsRef.current = events

  useEffect(() => {
    if (!channelName || !socketClient) return

    const client = socketClient

    // Join the room
    client.emit('join', channelName)

    const handlers = new Map<string, EventCallback>()

    eventsRef.current.forEach(({ event, callback }) => {
      const handler: EventCallback = (data) => {
        const currentCallback = eventsRef.current.find(e => e.event === event)?.callback
        if (currentCallback) {
          currentCallback(data)
        } else {
          callback(data)
        }
      }
      client.on(event, handler)
      handlers.set(event, handler)
    })

    return () => {
      handlers.forEach((handler, event) => {
        client.off(event, handler)
      })
      client.emit('leave', channelName)
    }
  }, [channelName])
}

export type { EventBinding, EventCallback }
