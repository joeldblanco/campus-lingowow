import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Block } from '@/types/course-builder'
import { GuidedLessonViewer } from './guided-lesson-viewer'

vi.mock('next/image', () => ({
  default: () => null,
}))

vi.mock('@/components/admin/course-builder/lesson-builder/block-preview', () => ({
  BlockPreview: ({
    block,
    onRecordingStateChange,
  }: {
    block: Block
    onRecordingStateChange?: (active: boolean) => void
  }) => {
    const isRecording = block.type === 'recording'

    return (
      <div data-testid={`preview-${block.id}`}>
        {block.type === 'text' && <input data-testid={`answer-${block.id}`} defaultValue="" />}
        {block.type === 'audio' && <audio data-testid={`audio-${block.id}`} />}
        {isRecording && (
          <button
            type="button"
            onClick={() => onRecordingStateChange?.(true)}
            onDoubleClick={() => onRecordingStateChange?.(false)}
          >
            Toggle recording
          </button>
        )}
      </div>
    )
  },
}))

function block(type: Block['type'], id: string, extra: Record<string, unknown> = {}): Block {
  return { id, type, order: 0, ...extra } as Block
}

describe('GuidedLessonViewer', () => {
  beforeEach(() => {
    sessionStorage.clear()
    vi.restoreAllMocks()
  })

  it('keeps every step renderer mounted and retains a response while navigating', () => {
    render(
      <GuidedLessonViewer
        blocks={[block('text', 'reading'), block('essay', 'writing')]}
        storageKey="lesson-retained"
      />
    )

    const answer = screen.getByTestId('answer-reading') as HTMLInputElement
    fireEvent.change(answer, { target: { value: 'My answer' } })
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))

    expect(screen.getByTestId('preview-reading')).toBeInTheDocument()
    expect(screen.getByTestId('preview-writing')).toBeInTheDocument()
    expect(screen.getByTestId('answer-reading')).toHaveValue('My answer')

    fireEvent.click(screen.getByRole('button', { name: 'Atrás' }))
    expect(screen.getByRole('heading', { name: 'Lectura' })).toHaveFocus()
  })

  it('resumes the active step and safely starts at the first step after corruption', () => {
    sessionStorage.setItem('lesson-resume', '1')
    const { unmount } = render(
      <GuidedLessonViewer
        blocks={[block('text', 'reading'), block('essay', 'writing')]}
        storageKey="lesson-resume"
      />
    )
    expect(screen.getByRole('heading', { name: 'Escritura' })).toBeInTheDocument()

    unmount()
    sessionStorage.setItem('lesson-corrupt', 'not a step')
    render(
      <GuidedLessonViewer
        blocks={[block('text', 'reading'), block('essay', 'writing')]}
        storageKey="lesson-corrupt"
      />
    )
    expect(screen.getByRole('heading', { name: 'Lectura' })).toBeInTheDocument()
  })

  it('pauses audio from the step left behind', async () => {
    const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)

    render(
      <GuidedLessonViewer
        blocks={[block('audio', 'audio-1'), block('essay', 'writing')]}
        storageKey="lesson-audio"
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))

    await waitFor(() => expect(pause).toHaveBeenCalled())
  })

  it('shows completion only on the final step', () => {
    const onComplete = vi.fn()
    render(
      <GuidedLessonViewer
        blocks={[block('text', 'reading'), block('essay', 'writing')]}
        storageKey="lesson-complete"
        onComplete={onComplete}
      />
    )

    expect(screen.queryByRole('button', { name: 'Completar lección' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
    fireEvent.click(screen.getByRole('button', { name: 'Completar lección' }))
    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it('holds navigation while a recording is active', () => {
    render(
      <GuidedLessonViewer
        blocks={[block('recording', 'speaking'), block('essay', 'writing')]}
        storageKey="lesson-recording"
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Toggle recording' }))
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))

    expect(screen.getByRole('heading', { name: 'Habla' })).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Detén la grabación')
  })
})
