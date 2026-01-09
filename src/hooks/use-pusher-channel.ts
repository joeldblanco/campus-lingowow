'use client'

import { pusherClient } from '@/lib/pusher'
import { useEffect, useRef, useMemo } from 'react'

type EventCallback<T = unknown> = (data: T) => void

interface EventBinding {
  event: string
  callback: EventCallback
}

export function usePusherChannel(
  channelName: string | null,
  events: EventBinding[]
) {
  const boundEventsRef = useRef<Map<string, EventCallback>>(new Map())

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableEvents = useMemo(() => events, [JSON.stringify(events.map(e => e.event))])

  useEffect(() => {
    if (!channelName) return

    let channel = pusherClient.channel(channelName)
    if (!channel) {
      channel = pusherClient.subscribe(channelName)
    }

    const currentBoundEvents = boundEventsRef.current

    stableEvents.forEach(({ event, callback }) => {
      if (currentBoundEvents.has(event)) {
        channel.unbind(event, currentBoundEvents.get(event))
      }
      channel.bind(event, callback)
      currentBoundEvents.set(event, callback)
    })

    return () => {
      stableEvents.forEach(({ event }) => {
        const cb = currentBoundEvents.get(event)
        if (cb) {
          channel.unbind(event, cb)
          currentBoundEvents.delete(event)
        }
      })

      const allChannels = pusherClient.allChannels()
      const channelStillExists = allChannels.find(c => c.name === channelName)
      const subscriptionCount = channel.subscriptionCount
      if (!channelStillExists || (subscriptionCount !== undefined && subscriptionCount !== null && subscriptionCount <= 1)) {
        pusherClient.unsubscribe(channelName)
      }
    }
  }, [channelName, stableEvents])
}

export type { EventBinding, EventCallback }
