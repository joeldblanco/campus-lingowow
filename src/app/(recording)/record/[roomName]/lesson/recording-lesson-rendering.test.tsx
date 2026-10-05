import { act, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))
vi.mock('@/lib/actions/lessons', () => ({ completeCourseLesson: vi.fn() }))
vi.mock('@/lib/actions/ai-grading-limits', () => ({ canUseAIGrading: vi.fn(), recordAIGradingUsage: vi.fn() }))
vi.mock('@/components/lessons/essay-ai-grading', () => ({ EssayAIGrading: () => null }))
vi.mock('@/components/lessons/recording-ai-grading', () => ({ RecordingAIGrading: () => null }))

import RecordingLessonClient from './recording-lesson-client'

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })

it('renders real platform text blocks in the recorder, including rich text formatting', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({
    id: 'lesson-real-renderer', title: 'Present simple', videoUrl: null,
    contents: [
      { id: 'explanation', order: 0, contentType: 'RICH_TEXT', data: { type: 'text', content: '<p>We use the <strong>present simple</strong> for habits.</p>' }, children: [] },
      { id: 'example', order: 1, contentType: 'RICH_TEXT', data: { type: 'text', content: '<p>She teaches English every morning.</p>' }, children: [] },
    ],
  }) }))
  const { container } = render(<RecordingLessonClient roomName="class-demo" />)
  act(() => window.dispatchEvent(new MessageEvent('message', {
    origin: window.location.origin, source: window,
    data: { source: 'lingowow-recorder', type: 'set-lesson', token: 'test-token', contentId: 'lesson-real-renderer', contentType: 'lesson' },
  })))
  expect(await screen.findByText('She teaches English every morning.')).toBeInTheDocument()
  expect(container.querySelector('[data-block-id="explanation"] strong')).toHaveTextContent('present simple')
  expect(container.querySelectorAll('[data-block-id]')).toHaveLength(2)
})

it('replays media and block navigation that arrived before the material finished loading', async () => {
  let finish: (value: unknown) => void = () => undefined
  vi.stubGlobal('fetch', vi.fn(() => new Promise(resolve => { finish = resolve })))
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { callback(0); return 1 })
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
  const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
  const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
  const scroll = vi.fn()
  const previousScroll = Element.prototype.scrollIntoView
  Element.prototype.scrollIntoView = scroll
  try {
    const { container } = render(<RecordingLessonClient roomName="class-demo" />)
    const send = (data: Record<string, unknown>) => act(() => window.dispatchEvent(new MessageEvent('message', {
      origin: window.location.origin, source: window, data: { source: 'lingowow-recorder', ...data },
    })))
    send({ type: 'set-lesson', token: 'test', contentId: 'audio-lesson', contentType: 'lesson' })
    send({ type: 'block-navigation', blockId: 'listening', currentStep: 1, totalSteps: 2, hasStarted: true })
    send({ type: 'audio-sync', blockId: 'listening', mediaType: 'audio', currentTime: 17, isPlaying: true })
    await act(async () => finish({ ok: true, json: async () => ({ id: 'audio-lesson', title: 'Listening', contents: [
      { id: 'listening', order: 0, contentType: 'AUDIO', data: { type: 'audio', title: 'Listening practice', url: 'https://example.test/lesson.mp3' }, children: [] },
    ] }) }))
    expect(await screen.findByText('Listening practice')).toBeInTheDocument()
    expect(scroll).toHaveBeenCalled()
    expect(play).toHaveBeenCalled()
    expect(container.querySelector('audio')?.currentTime).toBe(17)
    send({ type: 'set-visible', visible: false })
    expect(pause).toHaveBeenCalled()
  } finally {
    Element.prototype.scrollIntoView = previousScroll
  }
})
