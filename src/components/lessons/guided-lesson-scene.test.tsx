import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { GuidedLessonScene, LessonSceneBackdrop } from './guided-lesson-scene'

vi.mock('next/image', () => ({
  default: ({ src, className }: { src: string; className?: string }) => (
    <div data-testid="scene-image" data-src={src} className={className} />
  ),
}))

describe('guided lesson scene layers', () => {
  it('renders the complete environment as pointer-free cover artwork without a shaped crop', () => {
    const { container } = render(
      <GuidedLessonScene
        src="/images/lessons/this-is-me/peter-classroom-v3.webp"
        kind="vocabulary"
        variant="portrait"
        environment
      />
    )
    const art = container.querySelector('[data-illustrated-environment]')
    expect(art).toHaveClass('pointer-events-none', 'min-h-[320px]')
    expect(art).toHaveAttribute('aria-hidden', 'true')
    expect(art?.getAttribute('style') || '').not.toContain('clip-path')
    expect(container.querySelector('clipPath')).not.toBeInTheDocument()
    expect(container.querySelector('[data-testid="scene-image"]')).toHaveClass('object-cover')
  })

  it('provides a full-shell decorative backdrop without affecting layout or input', () => {
    const { container } = render(<LessonSceneBackdrop variant="portrait" />)
    const backdrop = container.querySelector('[data-guided-scene-backdrop]')

    expect(backdrop).toHaveClass('absolute', 'inset-0', 'overflow-hidden', 'pointer-events-none')
    const setting = backdrop?.querySelector('[data-illustrated-setting]')
    expect(setting).toHaveAttribute(
      'data-scene-src',
      '/images/lessons/this-is-me/study-room-v3.webp'
    )
    expect(setting).toHaveClass('absolute', 'inset-0', 'bg-cover')
    expect(setting).toHaveStyle({
      backgroundImage: 'url("/images/lessons/this-is-me/study-room-v3.webp")',
    })
    expect(setting?.getAttribute('style')).toContain('mask-image: linear-gradient(')
    expect(backdrop).toHaveAttribute('aria-hidden', 'true')
    expect(backdrop?.querySelector('button, input, a')).not.toBeInTheDocument()
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
