import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('livekit-server-sdk', () => {
  const receive = vi.fn()
  const WebhookReceiver = vi.fn().mockImplementation(() => ({ receive }))
  return { WebhookReceiver, __receive: receive }
})

vi.mock('@/lib/db', () => ({
  db: {
    classRecording: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock('@/lib/livekit-recording', () => ({
  startRoomRecording: vi.fn(),
}))

import * as livekitSdk from 'livekit-server-sdk'
import * as livekitRecording from '@/lib/livekit-recording'
import { POST } from './route'

const receiverReceive = (livekitSdk as unknown as { __receive: ReturnType<typeof vi.fn> }).__receive
const startRoomRecording = livekitRecording.startRoomRecording as unknown as ReturnType<
  typeof vi.fn
>

function buildRequest(body: string, auth = 'signed') {
  return new Request('http://localhost/api/livekit/webhook', {
    method: 'POST',
    headers: { Authorization: auth, 'content-type': 'application/json' },
    body,
  }) as unknown as Parameters<typeof POST>[0]
}

describe('POST /api/livekit/webhook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.LIVEKIT_API_KEY = 'test-key'
    process.env.LIVEKIT_API_SECRET = 'test-secret'
  })

  it('rejects requests with an invalid signature', async () => {
    receiverReceive.mockRejectedValueOnce(new Error('bad signature'))
    const res = await POST(buildRequest('{}'))
    expect(res.status).toBe(401)
  })

  it('returns 500 when LiveKit env config is missing', async () => {
    delete process.env.LIVEKIT_API_KEY
    const res = await POST(buildRequest('{}'))
    expect(res.status).toBe(500)
  })

  it('triggers recording when a room_started event arrives', async () => {
    receiverReceive.mockResolvedValueOnce({
      event: 'room_started',
      room: { name: 'class-abc' },
    })
    startRoomRecording.mockResolvedValueOnce({
      success: true,
      egressId: 'EG_x',
      segmentNumber: 1,
      alreadyRecording: false,
    })

    const res = await POST(buildRequest('{}'))
    expect(res.status).toBe(200)
    expect(startRoomRecording).toHaveBeenCalledWith('class-abc')
  })

  it('does not call startRoomRecording for non-room_started events', async () => {
    receiverReceive.mockResolvedValueOnce({
      event: 'participant_joined',
      room: { name: 'class-abc' },
    })

    const res = await POST(buildRequest('{}'))
    expect(res.status).toBe(200)
    expect(startRoomRecording).not.toHaveBeenCalled()
  })

  it('swallows startRoomRecording errors so LiveKit does not retry the webhook indefinitely', async () => {
    receiverReceive.mockResolvedValueOnce({
      event: 'room_started',
      room: { name: 'class-abc' },
    })
    startRoomRecording.mockRejectedValueOnce(new Error('boom'))

    const res = await POST(buildRequest('{}'))
    expect(res.status).toBe(200)
  })
})
