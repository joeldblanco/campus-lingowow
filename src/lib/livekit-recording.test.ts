import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/db', () => ({
  db: {
    classRecording: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    videoCall: {
      updateMany: vi.fn(),
    },
  },
}))

const startRoomCompositeEgress = vi.fn()
vi.mock('livekit-server-sdk', () => ({
  EgressClient: vi.fn().mockImplementation(() => ({
    startRoomCompositeEgress,
  })),
  EncodedFileOutput: vi.fn().mockImplementation((opts: unknown) => ({ ...(opts as object) })),
  EncodedFileType: { MP4: 'MP4' },
  S3Upload: vi.fn().mockImplementation((opts: unknown) => ({ ...(opts as object) })),
}))

import { db } from '@/lib/db'
import { startRoomRecording } from './livekit-recording'

describe('startRoomRecording', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_LIVEKIT_URL = 'wss://meet.example.com'
    process.env.LIVEKIT_API_KEY = 'key'
    process.env.LIVEKIT_API_SECRET = 'secret'
    delete process.env.CLOUDFLARE_R2_ACCOUNT_ID
    delete process.env.CLOUDFLARE_R2_ACCESS_KEY_ID
    delete process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY
  })

  it('rejects roomNames that do not follow the class-* convention', async () => {
    const result = await startRoomRecording('lobby-foo')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toMatch(/no es una sala de clase/i)
    }
    expect(db.classRecording.findFirst).not.toHaveBeenCalled()
  })

  it('returns alreadyRecording when an active egress exists', async () => {
    vi.mocked(db.classRecording.findFirst).mockResolvedValueOnce({
      egressId: 'EG_existing',
    } as never)

    const result = await startRoomRecording('class-booking-1')
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.alreadyRecording).toBe(true)
      expect(result.egressId).toBe('EG_existing')
    }
    expect(startRoomCompositeEgress).not.toHaveBeenCalled()
  })

  it('creates a new ClassRecording with PROCESSING status when no recording exists', async () => {
    vi.mocked(db.classRecording.findFirst).mockResolvedValueOnce(null as never)
    startRoomCompositeEgress.mockResolvedValueOnce({ egressId: 'EG_new' })
    vi.mocked(db.videoCall.updateMany).mockResolvedValue({ count: 1 } as never)
    vi.mocked(db.classRecording.findFirst).mockResolvedValueOnce({ segmentNumber: 2 } as never)
    vi.mocked(db.classRecording.create).mockResolvedValue({} as never)

    const result = await startRoomRecording('class-booking-1')
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.alreadyRecording).toBe(false)
      expect(result.egressId).toBe('EG_new')
      expect(result.segmentNumber).toBe(3)
    }
    expect(startRoomCompositeEgress).toHaveBeenCalledWith(
      'class-booking-1',
      expect.any(Object),
      expect.objectContaining({ layout: 'grid' })
    )
    expect(db.classRecording.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        bookingId: 'booking-1',
        egressId: 'EG_new',
        status: 'PROCESSING',
        segmentNumber: 3,
        roomName: 'class-booking-1',
      }),
    })
  })

  it('returns failure when LiveKit env config is missing', async () => {
    delete process.env.LIVEKIT_API_KEY
    const result = await startRoomRecording('class-booking-1')
    expect(result.success).toBe(false)
  })
})
