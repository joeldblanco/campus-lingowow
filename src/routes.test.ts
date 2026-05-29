import { describe, it, expect } from 'vitest'
import { apiPublicRoutes, publicRoutes, authRoutes } from './routes'

describe('routes allowlists', () => {
  it('does not include the removed /api/livekit/recording-token endpoint', () => {
    expect(apiPublicRoutes).not.toContain('/api/livekit/recording-token')
  })

  it('keeps the LiveKit webhook public (needs to receive unauthenticated calls from the LiveKit server)', () => {
    expect(apiPublicRoutes).toContain('/api/livekit/webhook')
  })

  it('keeps the egress recorder template publicly reachable (consumed by the headless Chrome recorder)', () => {
    expect(apiPublicRoutes).toContain('/api/livekit/egress-recorder')
    expect(apiPublicRoutes).toContain('/api/livekit/egress-recorder/*')
  })

  it('does NOT publish /api/livekit/token (must require an authenticated session)', () => {
    expect(apiPublicRoutes).not.toContain('/api/livekit/token')
  })

  it('does NOT publish /api/livekit/stop-recording or /api/livekit/test-recording', () => {
    expect(apiPublicRoutes).not.toContain('/api/livekit/stop-recording')
    expect(apiPublicRoutes).not.toContain('/api/livekit/test-recording')
  })

  it('has no duplicates in publicRoutes / authRoutes / apiPublicRoutes', () => {
    for (const list of [publicRoutes, authRoutes, apiPublicRoutes]) {
      const set = new Set(list)
      expect(set.size).toBe(list.length)
    }
  })
})
