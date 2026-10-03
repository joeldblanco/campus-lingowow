import { afterEach, expect, it, vi } from 'vitest'
import { buildEgressRecorderHtml } from './template'

vi.mock('@/lib/db', () => ({ db: {
  classRecording: { findFirst: vi.fn().mockResolvedValue(null) },
  videoCall: { findFirst: vi.fn().mockResolvedValue(null) },
  classBooking: { findUnique: vi.fn().mockResolvedValue(null) },
} }))
afterEach(() => { document.body.innerHTML = ''; vi.restoreAllMocks() })

it('passes selected material to the ready iframe, preserves it across tabs, and clears it when sharing stops', async () => {
  const html = await buildEgressRecorderHtml({ roomName: 'test-room', url: 'wss://example.test', token: 'test-recording-token' })
  document.body.innerHTML = html
  const handlers = new Map<string, (...args: unknown[]) => unknown>()
  class Room {
    localParticipant = { publishData: vi.fn() }
    remoteParticipants = new Map()
    on(event: string, callback: (...args: unknown[]) => unknown) { handlers.set(event, callback) }
    async connect() {}
  }
  const frame = document.querySelector('iframe')!
  expect(frame).not.toBeNull()
  const post = vi.spyOn(frame.contentWindow!, 'postMessage')
  const script = html.match(/<script type="module">([\s\S]*?)<\/script>/)![1]
    .replace(/import\s*\{[\s\S]*?\}\s*from\s*'[^']+';/, '')
  new Function('Room', 'RoomEvent', 'Track', 'RemoteParticipant', script)(
    Room, new Proxy({}, { get: (_target, key) => key }), { Source: {}, Kind: {} }, class {},
  )
  await Promise.resolve()
  const receive = async (command: string, values: Record<string, unknown>) => {
    await handlers.get('DataReceived')!(new TextEncoder().encode(JSON.stringify({ command, values })))
  }
  await receive('set-lesson', { type: 'SET_LESSON', lessonId: 'lesson-A', contentType: 'lesson' })
  window.dispatchEvent(new MessageEvent('message', {
    origin: window.location.origin, source: frame.contentWindow,
    data: { source: 'lingowow-recorder', type: 'lesson-frame-ready' },
  }))
  expect(post).toHaveBeenCalledWith(expect.objectContaining({
    type: 'set-lesson', contentId: 'lesson-A', contentType: 'lesson', token: 'test-recording-token',
  }), window.location.origin)
  await receive('set-tab', { type: 'SET_TAB', tab: 'screenshare' })
  expect(frame.closest('#lesson')?.classList.contains('hidden')).toBe(true)
  await receive('set-tab', { type: 'SET_TAB', tab: 'lesson' })
  expect(frame.closest('#lesson')?.classList.contains('hidden')).toBe(false)
  await receive('lesson-scroll', { type: 'LESSON_SCROLL', progress: 0.75 })
  expect(post).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'scroll-progress', progress: 0.75 }), window.location.origin)
  await receive('audio-sync', { type: 'AUDIO_PLAY', blockId: 'audio-A', currentTime: 12, mediaType: 'audio' })
  expect(post).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'audio-sync', blockId: 'audio-A', currentTime: 12, isPlaying: true }), window.location.origin)
  await receive('set-lesson', { type: 'SET_LESSON', lessonId: null })
  expect(post).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'clear-lesson' }), window.location.origin)
  expect(frame.closest('#lesson')?.classList.contains('hidden')).toBe(true)
})
