import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GuidedLessonBlock } from './guided-lesson-block'
import type { Block } from '@/types/course-builder'

const block: Extract<Block, { type: 'vocabulary' }> = { id: 'sounds', order: 0, type: 'vocabulary', title: 'Escucha', data: { teachingPresentation: 'pronunciation' }, items: [
  { id: 'a', term: 'A', definition: 'En Ana', audioUrl: '/audio/a.mp3' },
  { id: 'n', term: 'N', definition: 'En Ana', audioUrl: '/audio/n.mp3' },
] }
afterEach(() => vi.restoreAllMocks())
describe('guided pronunciation teaching', () => {
  it('renders real sound buttons and plays only after a deliberate click', async () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
    const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
    const view = render(<GuidedLessonBlock block={block}>classic fallback</GuidedLessonBlock>)
    expect(play).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Escuchar A' }))
    await waitFor(() => expect(play).toHaveBeenCalledTimes(1))
    expect(view.container.querySelector('audio')).toHaveAttribute('src', '/audio/a.mp3')
    fireEvent.click(screen.getByRole('button', { name: 'Escuchar N' }))
    expect(pause).toHaveBeenCalledTimes(2)
    expect(view.container.querySelector('audio')).toHaveAttribute('src', '/audio/n.mp3')
    view.unmount()
    expect(pause).toHaveBeenCalledTimes(3)
  })
  it('allows retry after a playback failure', async () => {
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockRejectedValueOnce(new Error('network')).mockResolvedValue()
    render(<GuidedLessonBlock block={block}>classic</GuidedLessonBlock>)
    fireEvent.click(screen.getByRole('button', { name: 'Escuchar A' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo reproducir')
    fireEvent.click(screen.getByRole('button', { name: 'Escuchar A' }))
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
    expect(play).toHaveBeenCalledTimes(2)
  })
  it('leaves other rich vocabulary on its established renderer', () => {
    render(<GuidedLessonBlock block={{ ...block, data: {} }}>Classic vocabulary</GuidedLessonBlock>)
    expect(screen.getByText('Classic vocabulary')).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Escuchar A' })).toBeNull()
  })
})
