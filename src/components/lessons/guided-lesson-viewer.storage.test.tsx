import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Block } from '@/types/course-builder'
import { GuidedLessonViewer } from './guided-lesson-viewer'

vi.mock('next/image', () => ({
  default: ({ src }: { src: string }) => <div data-testid="illustration" data-src={src} />,
}))

vi.mock('@/components/admin/course-builder/lesson-builder/block-preview', () => ({
  BlockPreview: ({ block }: { block: Block }) => <div>{block.type}</div>,
}))

function block(type: Block['type'], id: string): Block {
  return { id, type, order: 0 } as Block
}

describe('GuidedLessonViewer illustrated position storage', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('reads the versioned scene position while leaving the classic key untouched', () => {
    sessionStorage.setItem('illustrated-position', '1')

    const { unmount } = render(
      <GuidedLessonViewer
        blocks={[block('text', 'reading'), block('essay', 'writing')]}
        storageKey="illustrated-position"
        illustratedContent
        unitOneAuthored
      />
    )

    expect(screen.getByRole('heading', { name: 'Lectura' })).toBeInTheDocument()
    unmount()

    sessionStorage.setItem('illustrated-position:scene-v2', '1')
    render(
      <GuidedLessonViewer
        blocks={[block('text', 'reading'), block('essay', 'writing')]}
        storageKey="illustrated-position"
        illustratedContent
        unitOneAuthored
      />
    )

    expect(screen.getByRole('heading', { name: 'Escritura' })).toBeInTheDocument()
    expect(sessionStorage.getItem('illustrated-position')).toBe('1')
  })

  it('uses Peter for the authored vocabulary scene', () => {
    const vocabulary: Block = {
      id: 'vocabulary',
      type: 'vocabulary',
      order: 0,
      title: 'Vocabulario',
      items: [{ id: 'name', term: 'Name', definition: 'Peter' }],
    }

    const { container } = render(
      <GuidedLessonViewer blocks={[vocabulary]} storageKey="illustrated-peter" illustratedContent unitOneAuthored />
    )

    expect(screen.getByTestId('illustration')).toHaveAttribute(
      'data-src',
      '/images/lessons/this-is-me/peter.webp'
    )
    expect(container.querySelector('[data-guided-art]')).toHaveAttribute(
      'data-guided-scene-subject',
      'Peter'
    )
  })
})
