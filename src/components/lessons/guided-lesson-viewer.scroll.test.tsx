import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Block } from '@/types/course-builder'
import { GuidedLessonViewer } from './guided-lesson-viewer'

vi.mock('next/image', () => ({ default: () => null }))

vi.mock('@/components/admin/course-builder/lesson-builder/block-preview', () => ({
  BlockPreview: ({ block }: { block: Block }) => <div>{block.type}</div>,
}))

function block(type: Block['type'], id: string): Block {
  return { id, type, order: 0 } as Block
}

describe('GuidedLessonViewer step viewport', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('resets the lesson position and focus when the task changes', () => {
    const scrollIntoView = vi.fn()
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    })

    render(
      <GuidedLessonViewer
        blocks={[block('text', 'reading'), block('essay', 'writing')]}
        storageKey="viewer-scroll-reset"
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto', block: 'start' })
    expect(screen.getByRole('heading', { name: 'Escritura' })).toHaveFocus()
  })
})
