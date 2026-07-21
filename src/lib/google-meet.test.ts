import { beforeEach, describe, expect, it, vi } from 'vitest'

import { db } from '@/lib/db'

const getAccessToken = vi.fn()

vi.mock('google-auth-library', () => ({
  JWT: vi.fn(() => ({
    getAccessToken,
  })),
}))

vi.mock('@/lib/db', () => ({
  db: {
    $executeRaw: vi.fn(),
    $transaction: vi.fn(),
    classBooking: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))

import { ensureGoogleMeetSpaceForBooking } from './google-meet'

describe('ensureGoogleMeetSpaceForBooking', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.GOOGLE_MEET_CLIENT_EMAIL = 'service@example.iam.gserviceaccount.com'
    process.env.GOOGLE_MEET_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\\nkey\\n-----END PRIVATE KEY-----\\n'
    process.env.GOOGLE_MEET_IMPERSONATED_USER = 'admin@example.com'
    process.env.GOOGLE_MEET_ACCESS_TYPE = 'OPEN'
    getAccessToken.mockResolvedValue({ token: 'access-token' })
    const transactionMock = db.$transaction as unknown as ReturnType<typeof vi.fn>
    transactionMock.mockImplementation(async (callback: (tx: typeof db) => Promise<unknown>) =>
      callback(db)
    )
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          name: 'spaces/abc123',
          meetingUri: 'https://meet.google.com/abc-defg-hij',
        }),
      })
    )
  })

  it('does not create a Google Meet space when the booking already has a meeting URL', async () => {
    vi.mocked(db.classBooking.findUnique).mockResolvedValue({
      id: 'booking-1',
      meetingUrl: 'https://meet.google.com/existing',
      meetingSpaceName: 'spaces/existing',
      meetingCode: 'existing',
    } as never)

    const result = await ensureGoogleMeetSpaceForBooking('booking-1')

    expect(result).toEqual({
      success: true,
      meetingUrl: 'https://meet.google.com/existing',
      meetingSpaceName: 'spaces/existing',
      meetingCode: 'existing',
      created: false,
    })
    expect(fetch).not.toHaveBeenCalled()
    expect(db.$transaction).not.toHaveBeenCalled()
    expect(db.classBooking.update).not.toHaveBeenCalled()
  })

  it('creates and persists a Google Meet space when the booking has no meeting URL', async () => {
    vi.mocked(db.classBooking.findUnique).mockResolvedValue({
      id: 'booking-1',
      meetingUrl: null,
      meetingSpaceName: null,
      meetingCode: null,
    } as never)
    vi.mocked(db.classBooking.update).mockResolvedValue({} as never)

    const result = await ensureGoogleMeetSpaceForBooking('booking-1')

    expect(result).toMatchObject({
      success: true,
      meetingUrl: 'https://meet.google.com/abc-defg-hij',
      meetingSpaceName: 'spaces/abc123',
      meetingCode: 'abc-defg-hij',
      created: true,
    })
    expect(fetch).toHaveBeenCalledWith(
      'https://meet.googleapis.com/v2/spaces',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer access-token',
        }),
        body: JSON.stringify({ config: { accessType: 'OPEN' } }),
      })
    )
    expect(db.$executeRaw).toHaveBeenCalled()
    expect(db.classBooking.update).toHaveBeenCalledWith({
      where: { id: 'booking-1' },
      data: expect.objectContaining({
        meetingProvider: 'GOOGLE_MEET',
        meetingUrl: 'https://meet.google.com/abc-defg-hij',
        meetingSpaceName: 'spaces/abc123',
        meetingCode: 'abc-defg-hij',
        meetingLastError: null,
      }),
    })
  })

  it('reuses the meeting URL found after acquiring the booking lock', async () => {
    vi.mocked(db.classBooking.findUnique)
      .mockResolvedValueOnce({
        id: 'booking-1',
        meetingUrl: null,
        meetingSpaceName: null,
        meetingCode: null,
      } as never)
      .mockResolvedValueOnce({
        id: 'booking-1',
        meetingUrl: 'https://meet.google.com/already-created',
        meetingSpaceName: 'spaces/already-created',
        meetingCode: 'already-created',
      } as never)

    const result = await ensureGoogleMeetSpaceForBooking('booking-1')

    expect(result).toEqual({
      success: true,
      meetingUrl: 'https://meet.google.com/already-created',
      meetingSpaceName: 'spaces/already-created',
      meetingCode: 'already-created',
      created: false,
    })
    expect(db.$executeRaw).toHaveBeenCalled()
    expect(fetch).not.toHaveBeenCalled()
    expect(db.classBooking.update).not.toHaveBeenCalled()
  })

  it('stores a retryable error when Google Meet API fails', async () => {
    vi.mocked(db.classBooking.findUnique).mockResolvedValue({
      id: 'booking-1',
      meetingUrl: null,
      meetingSpaceName: null,
      meetingCode: null,
    } as never)
    vi.mocked(db.classBooking.update).mockResolvedValue({} as never)
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        text: vi.fn().mockResolvedValue('domain-wide delegation missing'),
      })
    )

    const result = await ensureGoogleMeetSpaceForBooking('booking-1')

    expect(result).toEqual({
      success: false,
      error: 'Google Meet API 403: domain-wide delegation missing',
      retryable: true,
    })
    expect(db.classBooking.update).toHaveBeenCalledWith({
      where: { id: 'booking-1' },
      data: {
        meetingProvider: 'GOOGLE_MEET',
        meetingLastError: 'Google Meet API 403: domain-wide delegation missing',
      },
    })
  })
})
