import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import type { Block } from '@/types/course-builder'
import { GuidedLessonViewer } from './guided-lesson-viewer'

vi.mock('next/image', () => ({
  default: ({ src }: { src: string }) => <div data-testid="guided-illustration" data-src={src} />,
}))

vi.mock('./guided-lesson-block', () => ({
  GuidedLessonBlock: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

vi.mock('@/components/admin/course-builder/lesson-builder/block-preview', () => ({
  BlockPreview: ({ block }: { block: Block }) => (
    <div data-testid={`preview-${block.id}`}>Control original: {block.type}</div>
  ),
}))

function block(type: Block['type'], id: string): Block {
  return { id, type, order: 0 } as Block
}

describe('GuidedLessonViewer graphic guide shell', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('keeps one visible task heading and removes the duplicated step label from the header', () => {
    render(<GuidedLessonViewer blocks={[block('text', 'reading')]} storageKey="guide-heading" />)

    expect(screen.getAllByText('Lectura')).toHaveLength(1)
    expect(screen.getByRole('heading', { name: 'Lectura' })).toHaveClass(
      'font-[Georgia,serif]',
      'text-[26px]',
      'sm:text-[32px]'
    )
    expect(screen.queryByTestId('guided-illustration')).not.toBeInTheDocument()
  })

  it('only uses approved character art for reading and authored grammar context', () => {
    render(
      <GuidedLessonViewer
        blocks={[block('text', 'reading'), block('grammar-visualizer', 'grammar')]}
        storageKey="guide-art"
        illustratedContent
      />
    )

    expect(screen.getByTestId('guided-illustration')).toHaveAttribute(
      'data-src',
      '/images/lessons/this-is-me/carl.webp'
    )

    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
    expect(screen.getByTestId('guided-illustration')).toHaveAttribute(
      'data-src',
      '/images/lessons/this-is-me/lucas.webp'
    )
  })

  it('omits decorative art from production, reference tables, and practice steps', () => {
    const { container } = render(
      <GuidedLessonViewer
        blocks={[
          block('essay', 'writing'),
          block('structured-content', 'table'),
          block('true_false', 'practice'),
        ]}
        storageKey="guide-art-omissions"
        illustratedContent
      />
    )

    expect(container.querySelector('[data-guided-art]')).not.toBeInTheDocument()
    expect(screen.getByTestId('preview-writing')).toBeInTheDocument()
    expect(screen.getByTestId('preview-table')).toBeInTheDocument()
    expect(screen.getByTestId('preview-practice')).toBeInTheDocument()
  })

  it('places content before optional art in mobile source order and keeps controls target sized', () => {
    const { container } = render(
      <GuidedLessonViewer
        blocks={[block('text', 'reading'), block('essay', 'writing')]}
        storageKey="guide-responsive-order"
        illustratedContent
      />
    )

    const content = container.querySelector('[data-guided-content]')
    const art = container.querySelector('[data-guided-art]')
    expect(content).toBeTruthy()
    expect(art).toBeTruthy()
    expect(content!.compareDocumentPosition(art!)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    expect(content).toHaveClass('order-1', 'md:order-1')
    expect(art).toHaveClass('order-2', 'md:order-2')

    expect(screen.getByRole('button', { name: 'Atrás' })).toHaveClass(
      'min-h-11',
      'focus-visible:outline-2',
      'focus-visible:outline-offset-2'
    )
    expect(screen.getByRole('button', { name: 'Siguiente' })).toHaveClass(
      'min-h-12',
      'focus-visible:outline-2',
      'focus-visible:outline-offset-2'
    )
  })
})
