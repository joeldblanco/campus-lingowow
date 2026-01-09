'use client'

import { pusherClient } from '@/lib/pusher'
import { useEffect, useRef } from 'react'

type EventCallback<T = unknown> = (data: T) => void

interface EventBinding {
  event: string
  callback: EventCallback
}

export function usePusherChannel(
  channelName: string | null,
  events: EventBinding[]
) {
  const eventsRef = useRef(events)
  eventsRef.current = events

  useEffect(() => {
    if (!channelName) return

    let channel = pusherClient.channel(channelName)
    if (!channel) {
      channel = pusherClient.subscribe(channelName)
    }

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
      channel.bind(event, handler)
      handlers.set(event, handler)
    })

    return () => {
      handlers.forEach((handler, event) => {
        channel.unbind(event, handler)
      })

      const allChannels = pusherClient.allChannels()
      const channelStillExists = allChannels.find(c => c.name === channelName)
      const subscriptionCount = channel.subscriptionCount
      if (!channelStillExists || (subscriptionCount !== undefined && subscriptionCount !== null && subscriptionCount <= 1)) {
        pusherClient.unsubscribe(channelName)
      }
    }
  }, [channelName])
}

export type { EventBinding, EventCallback }
