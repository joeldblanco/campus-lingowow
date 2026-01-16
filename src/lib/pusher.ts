import PusherServer from 'pusher'
import PusherClient from 'pusher-js'

export const pusherServer = new PusherServer({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true,
})

declare global {
  var pusherClientInstance: PusherClient | undefined
}

function getPusherClient(): PusherClient {
  if (typeof window === 'undefined') {
    return new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      enabledTransports: ['ws', 'wss'],
    })
  }

  if (!globalThis.pusherClientInstance) {
    globalThis.pusherClientInstance = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      enabledTransports: ['ws', 'wss'],
    })
  }

  return globalThis.pusherClientInstance
}

export const pusherClient = getPusherClient()
