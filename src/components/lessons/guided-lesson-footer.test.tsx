import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Block } from '@/types/course-builder'
import { GuidedLessonViewer } from './guided-lesson-viewer'

vi.mock('next/image', () => ({ default: () => null }))
vi.mock('@/components/admin/course-builder/lesson-builder/block-preview', () => ({
  BlockPreview: function Preview({ block, guidedActionTarget, onGuidedActionPresence, onGuidedCompletionChange }: {
    block: Block
    guidedActionTarget?: HTMLElement | null
    onGuidedActionPresence?: (present: boolean) => void
    onGuidedCompletionChange?: (complete: boolean) => void
  }) {
    const [checked, setChecked] = useState(false)
    useEffect(() => {
      onGuidedActionPresence?.(block.type === 'essay')
      return () => onGuidedActionPresence?.(false)
    }, [block.type, onGuidedActionPresence])
    useEffect(() => { onGuidedCompletionChange?.(checked) }, [checked, onGuidedCompletionChange])
    if (block.type !== 'essay') return <p>Original content</p>
    const action = <button onClick={() => setChecked(true)}>Comprobar</button>
    return <>{checked && <p role="status">Resultado guardado</p>}{guidedActionTarget ? createPortal(action, guidedActionTarget) : action}</>
  },
}))

beforeEach(() => sessionStorage.clear())

describe('guided primary footer actions', () => {
  it('does not mark an unfinished retaken activity completed just because the lesson was completed', () => {
    render(<GuidedLessonViewer blocks={[{ id: 'essay', type: 'essay', order: 0, prompt: 'Write' }]} storageKey="footer-retake" isCompleted illustratedContent />)
    expect(screen.queryByText('Completada')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Comprobar' }))
    expect(screen.getByText('Completada')).toBeVisible()
  })

  it('places the real activity action in the footer and preserves its state across steps', async () => {
    const blocks: Block[] = [
      { id: 'essay', type: 'essay', order: 0, prompt: 'Write your profile' },
      { id: 'reading', type: 'text', order: 1, format: 'plain', content: 'Reading' },
    ]
    render(<GuidedLessonViewer blocks={blocks} storageKey="footer-state" illustratedContent />)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Comprobar' }).closest('[data-guided-footer]')).not.toBeNull())
    expect(screen.queryByRole('button', { name: 'Continuar' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Saltar ejercicio' })).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Comprobar' }))
    expect(screen.queryByRole('button', { name: 'Comprobar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Saltar ejercicio' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Paso anterior' }))
    expect(screen.getByRole('status')).toHaveTextContent('Resultado guardado')
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeVisible()
  })

  it('allows an explicit skip without inventing a correction or losing the unfinished activity', () => {
    render(<GuidedLessonViewer blocks={[
      { id: 'essay', type: 'essay', order: 0, prompt: 'Write' },
      { id: 'reading', type: 'text', order: 1, format: 'plain', content: 'Reading' },
    ]} storageKey="footer-skip" illustratedContent />)
    fireEvent.click(screen.getByRole('button', { name: 'Saltar ejercicio' }))
    expect(screen.getByRole('heading', { name: 'Lectura' })).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Paso anterior' }))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Continuar' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Comprobar' })).toBeVisible()
  })

  it('reveals lesson completion only after the final exercise is corrected', () => {
    const onComplete = vi.fn()
    render(<GuidedLessonViewer blocks={[{ id: 'essay', type: 'essay', order: 0, prompt: 'Write' }]} storageKey="footer-final" onComplete={onComplete} illustratedContent />)
    expect(screen.queryByRole('button', { name: 'Terminar lección' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Comprobar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Terminar lección' }))
    expect(onComplete).toHaveBeenCalledOnce()
  })
})
