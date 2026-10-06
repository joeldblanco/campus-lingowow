import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Block } from '@/types/course-builder'
import { GuidedLessonViewer } from './guided-lesson-viewer'

vi.mock('next/image', () => ({ default: () => null }))
vi.mock('@/components/admin/course-builder/lesson-builder/block-preview', () => ({
  BlockPreview: function Preview({ block, guidedActionTarget, onGuidedActionPresence }: {
    block: Block
    guidedActionTarget?: HTMLElement | null
    onGuidedActionPresence?: (present: boolean) => void
  }) {
    const [checked, setChecked] = useState(false)
    useEffect(() => {
      onGuidedActionPresence?.(block.type === 'essay')
      return () => onGuidedActionPresence?.(false)
    }, [block.type, onGuidedActionPresence])
    if (block.type !== 'essay') return <p>Original content</p>
    const action = <button onClick={() => setChecked(true)}>{checked ? 'Resultado guardado' : 'Comprobar'}</button>
    return guidedActionTarget ? createPortal(action, guidedActionTarget) : action
  },
}))

beforeEach(() => sessionStorage.clear())

describe('guided primary footer actions', () => {
  it('places the real activity action in the footer and preserves its state across steps', async () => {
    const blocks: Block[] = [
      { id: 'essay', type: 'essay', order: 0, prompt: 'Write your profile' },
      { id: 'reading', type: 'text', order: 1, format: 'plain', content: 'Reading' },
    ]
    render(<GuidedLessonViewer blocks={blocks} storageKey="footer-state" illustratedContent />)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Comprobar' }).closest('[data-guided-footer]')).not.toBeNull())
    fireEvent.click(screen.getByRole('button', { name: 'Comprobar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Continuar lección' }))
    expect(screen.queryByRole('button', { name: 'Resultado guardado' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Atrás' }))
    expect(screen.getByRole('button', { name: 'Resultado guardado' })).toBeVisible()
  })
})
