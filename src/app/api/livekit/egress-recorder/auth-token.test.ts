// @vitest-environment node
import { AccessToken } from 'livekit-server-sdk'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/db', () => ({ db: {
  classRecording: { findFirst: vi.fn().mockResolvedValue(null) },
  videoCall: { findFirst: vi.fn().mockResolvedValue(null) },
  classBooking: { findUnique: vi.fn().mockResolvedValue(null) },
} }))
import { authorizeRecorderToken } from './auth'

describe('recorder signed JWT integration', () => {
  beforeEach(() => {
    vi.stubEnv('LIVEKIT_API_KEY', 'recorder-test-key')
    vi.stubEnv('LIVEKIT_API_SECRET', 'recorder-test-secret-only-not-production')
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  })
  afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks() })

  async function token(secret = process.env.LIVEKIT_API_SECRET, recorder = true) {
    const access = new AccessToken(process.env.LIVEKIT_API_KEY, secret, { identity: 'test-egress', ttl: '5m' })
    if (recorder) access.kind = 'egress'
    access.addGrant({ room: 'synthetic-room', roomJoin: true, canSubscribe: true, recorder })
    return access.toJwt()
  }
  it('accepts a real SDK-signed egress token', async () => {
    await expect(authorizeRecorderToken(await token())).resolves.toEqual({ roomName: 'synthetic-room', bookingId: null, booking: null })
  })
  it('rejects a token signed with a different secret', async () => {
    await expect(authorizeRecorderToken(await token('wrong-secret'))).resolves.toBeNull()
  })
  it('rejects a valid participant token that has no recording grant', async () => {
    await expect(authorizeRecorderToken(await token(undefined, false))).resolves.toBeNull()
  })
})
