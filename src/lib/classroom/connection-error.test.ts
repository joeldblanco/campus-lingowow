import { describe, it, expect } from 'vitest'
import { classifyConnectionError, getConnectionErrorCopy } from './connection-error'

describe('classifyConnectionError', () => {
  it('treats a missing token as an auth/session problem (our side)', () => {
    expect(classifyConnectionError(false, null)).toBe('auth')
    expect(classifyConnectionError(false, new Error('whatever'))).toBe('auth')
  })

  it('classifies a 401/403 from the signaling server as auth', () => {
    expect(classifyConnectionError(true, { status: 401 })).toBe('auth')
    expect(classifyConnectionError(true, { status: 403 })).toBe('auth')
  })

  it('classifies missing server configuration as server', () => {
    expect(classifyConnectionError(true, new Error('NEXT_PUBLIC_LIVEKIT_URL not configured'))).toBe(
      'server'
    )
  })

  it('classifies a 5xx / internal reason as server', () => {
    expect(classifyConnectionError(true, { status: 503 })).toBe('server')
    expect(classifyConnectionError(true, { reason: 'InternalError' })).toBe('server')
  })

  it('classifies a connection timeout as a network problem', () => {
    expect(classifyConnectionError(true, new Error('LiveKit connection timeout'))).toBe('network')
  })

  it('classifies an unreachable signaling server as network', () => {
    expect(classifyConnectionError(true, { reason: 'ServerUnreachable' })).toBe('network')
  })

  it('defaults an unknown connect failure (token present) to network', () => {
    expect(classifyConnectionError(true, new Error('ICE failed'))).toBe('network')
    expect(classifyConnectionError(true, {})).toBe('network')
  })

  it('treats a NotAllowed reason as auth (token rejected)', () => {
    expect(classifyConnectionError(true, { reason: 'NotAllowed' })).toBe('auth')
  })

  it('classifies a post-signal failure (signaling opened, media failed) as media', () => {
    // Signaling reached the server, so a timeout/unknown failure is the media path.
    expect(classifyConnectionError(true, new Error('LiveKit connection timeout'), true)).toBe(
      'media'
    )
    expect(classifyConnectionError(true, {}, true)).toBe('media')
  })

  it('still treats a pre-signal failure (signaling never opened) as network', () => {
    expect(classifyConnectionError(true, new Error('LiveKit connection timeout'), false)).toBe(
      'network'
    )
  })

  it('lets an explicit reason win over the signalConnected hint', () => {
    // A token rejection or server error is not reclassified as media just because
    // the signaling socket happened to open first.
    expect(classifyConnectionError(true, { status: 401 }, true)).toBe('auth')
    expect(classifyConnectionError(true, { reason: 'InternalError' }, true)).toBe('server')
  })
})

describe('getConnectionErrorCopy', () => {
  it('tells network-failure users it is their connection (not generic)', () => {
    const copy = getConnectionErrorCopy('network')
    expect(copy.title).toMatch(/conexión/i)
    expect(copy.message.toLowerCase()).toContain('red')
  })

  it('frames server failures as our side', () => {
    const copy = getConnectionErrorCopy('server')
    expect(copy.title.toLowerCase()).toContain('servicio')
  })

  it('frames auth failures as a session problem', () => {
    const copy = getConnectionErrorCopy('auth')
    expect(copy.message.toLowerCase()).toContain('sesión')
  })

  it('frames media failures as connected-but-no-video, distinct from network', () => {
    const media = getConnectionErrorCopy('media')
    const network = getConnectionErrorCopy('network')
    // Distinct copy from the plain network case so support can tell them apart.
    expect(media.title).not.toBe(network.title)
    // Names the media path and still offers an actionable network workaround.
    expect(media.message.toLowerCase()).toContain('video')
    expect(media.message.toLowerCase()).toContain('red')
  })
})
