import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { GuidedLessonScene, LessonSceneBackdrop } from './guided-lesson-scene'

vi.mock('next/image', () => ({
  default: ({ src }: { src: string }) => <div data-testid="scene-image" data-src={src} />,
}))

describe('guided lesson scene layers', () => {
  it('provides a full-shell decorative backdrop without affecting layout or input', () => {
    const { container } = render(<LessonSceneBackdrop variant="portrait" />)
    const backdrop = container.querySelector('[data-guided-scene-backdrop]')

    expect(backdrop).toHaveClass('absolute', 'inset-0', 'overflow-hidden', 'pointer-events-none')
    expect(backdrop?.querySelectorAll('.guided-lesson-scene-backdrop__wash')).toHaveLength(3)
    expect(backdrop?.querySelector('.guided-lesson-scene-backdrop__band')).toBeInTheDocument()
    expect(backdrop?.querySelector('.guided-lesson-scene-backdrop__band-edge')).toBeInTheDocument()
  })

  it('keeps the portrait layer transparent so the broad backdrop is the only wash', () => {
    const { container } = render(
      <GuidedLessonScene
        src="/images/lessons/this-is-me/peter.webp"
        kind="vocabulary"
        variant="portrait"
      />
    )

    expect(container.querySelector('[data-guided-art]')).not.toHaveClass('bg-[#EEE8FA]')
    expect(container.querySelector('.guided-lesson-scene__wash')).not.toBeInTheDocument()
    expect(container.querySelector('[data-testid="scene-image"]')).toHaveAttribute(
      'data-src',
      '/images/lessons/this-is-me/peter.webp'
    )
  })
})
