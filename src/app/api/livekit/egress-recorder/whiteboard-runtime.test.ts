import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildEgressRecorderHtml } from './template'

vi.mock('@/lib/db', () => ({ db: {
  classRecording: { findFirst: vi.fn().mockResolvedValue(null) },
  videoCall: { findFirst: vi.fn().mockResolvedValue(null) },
  classBooking: { findUnique: vi.fn().mockResolvedValue(null) },
} }))

describe('recording whiteboard runtime', () => {
  afterEach(() => { vi.useRealTimers(); document.body.innerHTML = '' })

  it('renders the shared scene received from teacher and then student, preserving both drawings', async () => {
    vi.useFakeTimers()
    const html = await buildEgressRecorderHtml({ roomName: 'test-room', url: 'wss://example.test', token: 'test' })
    document.body.innerHTML = html
    const handlers = new Map<string, (...args: unknown[]) => unknown>()
    const publishData = vi.fn()
    class Room {
      localParticipant = { publishData }
      remoteParticipants = new Map()
      on(event: string, callback: (...args: unknown[]) => unknown) { handlers.set(event, callback) }
      async connect() {}
    }
    const exportToSvg = vi.fn(async ({ elements }: { elements: Array<{ id: string }> }) => {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      elements.forEach(element => {
        const rect = document.createElementNS(svg.namespaceURI, 'rect')
        rect.setAttribute('data-author', element.id)
        svg.appendChild(rect)
      })
      return svg
    })
    const script = html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1]
    expect(script).toBeTruthy()
    const runnable = script!
      .replace(/import\s*\{[\s\S]*?\}\s*from\s*'[^']+';/, '')
      .replace(/await import\('https:\/\/esm\.sh\/[^']+'\)/, '({ exportToSvg })')
    const events = new Proxy({}, { get: (_target, key) => key })
    new Function('Room', 'RoomEvent', 'Track', 'RemoteParticipant', 'exportToSvg', runnable)(
      Room, events, { Source: {}, Kind: {} }, class {}, exportToSvg,
    )
    await vi.advanceTimersByTimeAsync(1)
    expect(publishData).toHaveBeenCalled()
    const receive = handlers.get('DataReceived')!
    const update = (elements: Array<{ id: string }>, identity: string) => receive(
      new TextEncoder().encode(JSON.stringify({ command: 'whiteboard-sync', values: { type: 'WHITEBOARD_UPDATE', elements } })),
      { identity },
    )
    await update([{ id: 'teacher' }], 'teacher')
    await vi.advanceTimersByTimeAsync(150)
    expect(document.querySelector('[data-author="teacher"]')).not.toBeNull()
    await update([{ id: 'teacher' }, { id: 'student' }], 'student')
    await vi.advanceTimersByTimeAsync(150)
    expect(document.querySelectorAll('#whiteboard-canvas rect')).toHaveLength(2)
    expect(document.querySelector('[data-author="student"]')).not.toBeNull()
    expect(document.getElementById('whiteboard')?.classList.contains('hidden')).toBe(false)
    await update([], 'student')
    await vi.advanceTimersByTimeAsync(150)
    expect(document.querySelectorAll('#whiteboard-canvas rect')).toHaveLength(0)
    expect(document.getElementById('whiteboard-canvas')?.textContent).toContain('Pizarra vacía')
  })
})
