import { act, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useClassroomSync } from '@/components/classroom/use-classroom-sync'

const lessonRenderer = vi.hoisted(() => vi.fn())

vi.mock('@/components/lessons/lesson-content', () => ({
  LessonContent: (props: {
    lesson: { id: string; title: string; contents?: Array<{ id: string }> }
    isTeacher?: boolean
    isClassroom?: boolean
  }) => {
    const classroomSync = useClassroomSync()
    const navigation = classroomSync.getRemoteNavigation(props.lesson.contents?.[0]?.id || '')
    lessonRenderer(props)
    return (
      <div data-testid="native-lesson-renderer">
        {props.lesson.title}
        <span data-testid="renderer-mode">
          {String(props.isTeacher)}:{String(props.isClassroom)}
        </span>
        <span data-testid="remote-navigation-step">{navigation?.currentStep ?? 'none'}</span>
      </div>
    )
  },
}))

import RecordingLessonClient from './recording-lesson-client'

const lessonOne = { id: 'lesson-1', title: 'Native lesson one', contents: [{ id: 'block-1' }] }
const lessonTwo = { id: 'lesson-2', title: 'Native lesson two', contents: [{ id: 'block-2' }] }

function sendRecorderMessage(data: Record<string, unknown>) {
  act(() => {
    window.dispatchEvent(new MessageEvent('message', {
      data: { source: 'lingowow-recorder', ...data },
      origin: window.location.origin,
      source: window,
    }))
  })
}

describe('RecordingLessonClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', vi.fn())
  })

  it('loads authenticated content through the native LessonContent renderer', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => lessonOne,
    } as Response)

    render(<RecordingLessonClient roomName="class-1" />)
    sendRecorderMessage({
      type: 'set-lesson',
      token: 'signed-egress-token',
      contentId: 'lesson-1',
      contentType: 'lesson',
    })

    await waitFor(() => expect(screen.getByTestId('native-lesson-renderer')).toHaveTextContent('Native lesson one'))
    expect(screen.getByTestId('renderer-mode')).toHaveTextContent('true:true')
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('contentId=lesson-1'),
      expect.objectContaining({
        headers: { Authorization: 'Bearer signed-egress-token' },
      })
    )

    sendRecorderMessage({
      type: 'block-navigation',
      blockId: 'block-1',
      currentStep: 2,
      totalSteps: 4,
      hasStarted: true,
      isCompleted: false,
      participantName: 'Student',
    })
    expect(screen.getByTestId('remote-navigation-step')).toHaveTextContent('2')
  })

  it('ignores a stale response after a later lesson selection', async () => {
    let resolveFirst: (value: Response) => void = () => undefined
    let resolveSecond: (value: Response) => void = () => undefined
    vi.mocked(fetch)
      .mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve }))
      .mockImplementationOnce(() => new Promise((resolve) => { resolveSecond = resolve }))

    render(<RecordingLessonClient roomName="class-1" />)
    sendRecorderMessage({ type: 'set-lesson', token: 'token', contentId: 'lesson-1', contentType: 'lesson' })
    sendRecorderMessage({ type: 'set-lesson', token: 'token', contentId: 'lesson-2', contentType: 'lesson' })

    await act(async () => {
      resolveSecond({ ok: true, json: async () => lessonTwo } as Response)
      resolveFirst({ ok: true, json: async () => lessonOne } as Response)
    })

    await waitFor(() => expect(screen.getByTestId('native-lesson-renderer')).toHaveTextContent('Native lesson two'))
    expect(screen.queryByText('Native lesson one')).not.toBeInTheDocument()
  })

  it('clears the native renderer and pending classroom state', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => lessonOne,
    } as Response)

    render(<RecordingLessonClient roomName="class-1" />)
    sendRecorderMessage({ type: 'set-lesson', token: 'token', contentId: 'lesson-1', contentType: 'lesson' })
    await waitFor(() => expect(screen.getByTestId('native-lesson-renderer')).toBeInTheDocument())

    sendRecorderMessage({ type: 'clear-lesson' })

    await waitFor(() => expect(screen.queryByTestId('native-lesson-renderer')).not.toBeInTheDocument())
    expect(screen.getByText('Esperando contenido de la lección...')).toBeInTheDocument()
  })
})
