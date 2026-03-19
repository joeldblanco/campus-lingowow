import { io, Socket } from 'socket.io-client'

// --- Client-side singleton ---

declare global {
  var socketClientInstance: Socket | undefined
}

function getSocketClient(): Socket | null {
  if (typeof window === 'undefined') {
    return null
  }

  if (!globalThis.socketClientInstance) {
    const url = process.env.NEXT_PUBLIC_SOCKETIO_URL || 'https://ws.lingowow.com'
    globalThis.socketClientInstance = io(url, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      autoConnect: true,
    })
  }

  return globalThis.socketClientInstance
}

export const socketClient = getSocketClient()

// --- Server-side emitter (replaces pusherServer) ---

const SOCKETIO_INTERNAL_URL = process.env.SOCKETIO_INTERNAL_URL || 'http://localhost:3001'
const SOCKETIO_INTERNAL_SECRET = process.env.SOCKETIO_INTERNAL_SECRET || ''

export const socketServer = {
  /**
   * Emit an event to a room (equivalent to pusherServer.trigger)
   */
  async trigger(room: string, event: string, data: unknown): Promise<void> {
    const res = await fetch(`${SOCKETIO_INTERNAL_URL}/emit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SOCKETIO_INTERNAL_SECRET}`,
      },
      body: JSON.stringify({ room, event, data }),
    })

    if (!res.ok) {
      console.error(`[socketServer.trigger] Failed: ${res.status} ${res.statusText}`)
    }
  },

  /**
   * Emit events to multiple rooms in a single request
   */
  async triggerBatch(
    events: Array<{ room: string; event: string; data: unknown }>
  ): Promise<void> {
    const res = await fetch(`${SOCKETIO_INTERNAL_URL}/emit-batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SOCKETIO_INTERNAL_SECRET}`,
      },
      body: JSON.stringify({ events }),
    })

    if (!res.ok) {
      console.error(`[socketServer.triggerBatch] Failed: ${res.status} ${res.statusText}`)
    }
  },
}
