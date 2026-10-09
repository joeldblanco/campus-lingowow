import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { GuidedLessonBlock, isTechnicalGuidedTitle } from './guided-lesson-block'

describe('guided presentation content', () => {
  it('keeps every grammar set, variant, hint, and token visible in one flat sequence', () => {
    const { container } = render(
      <GuidedLessonBlock
        block={{
          id: 'grammar',
          type: 'grammar-visualizer',
          order: 0,
          description: 'Use this form for a current state.',
          sets: [
            {
              id: 'to-be',
              title: 'To be',
              hint: 'Read all three forms.',
              variants: [
                {
                  id: 'affirmative',
                  label: 'Afirmativo',
                  rawSentence: 'I am ready.',
                  tokens: [],
                },
                {
                  id: 'negative',
                  label: 'Negativo',
                  rawSentence: 'I am not ready.',
                  tokens: [
                    { id: 'i', content: 'I', grammarType: 'subject' },
                    { id: 'am', content: 'am', grammarType: 'linking-verb' },
                    { id: 'not', content: 'not', grammarType: 'negation' },
                    { id: 'ready', content: 'ready', grammarType: 'adjective' },
                  ],
                  hint: 'Keep the negation after the verb.',
                },
                {
                  id: 'question',
                  label: 'Interrogativo',
                  rawSentence: 'Am I ready?',
                  tokens: [],
                },
              ],
            },
          ],
        }}
      >
        fallback
      </GuidedLessonBlock>
    )

    expect(screen.getByRole('heading', { name: 'To be' })).toBeVisible()
    expect(screen.getByText('I am ready.')).toBeVisible()
    expect(screen.getByText('not', { exact: true })).toHaveClass('text-[#C13E50]')
    expect(screen.getByText('Keep the negation after the verb.')).toBeVisible()
    expect(screen.getByText('Read all three forms.')).toBeVisible()
    expect(screen.getByText('Am I ready?')).toBeVisible()
    expect(screen.queryByRole('tab')).not.toBeInTheDocument()
    expect(container.querySelector('.grid')).toBeNull()
  })

  it('renders a reading block at the guide body size while keeping all authored text', () => {
    const { container } = render(
      <GuidedLessonBlock
        block={{
          id: 'reading',
          type: 'text',
          order: 0,
          content: '<p>First paragraph.</p><p>Second paragraph with <strong>detail</strong>.</p>',
        }}
      >
        fallback
      </GuidedLessonBlock>
    )

    const reading = container.firstElementChild
    expect(reading).toHaveClass('text-base', 'leading-6', 'text-[#10245C]')
    expect(reading).not.toHaveClass('bg-[#FAF8F4]')
    expect(screen.getByText('First paragraph.')).toBeVisible()
    expect(screen.getByText(/Second paragraph with/)).toBeVisible()
    expect(screen.getByText('detail')).toBeVisible()
  })

  it('blends authored Carl reading into the scene while removing empty spacer paragraphs', () => {
    const { container } = render(
      <GuidedLessonBlock
        block={{
          id: 'carl-reading',
          type: 'text',
          order: 0,
          content:
            '<p><b>Carl Johnson</b></p><p><br></p><p><i>My name is Carl Johnson and I am 32 years old.</i></p><p><a href="https://example.com">Read more</a></p><script>alert(1)</script>',
        }}
      >
        fallback
      </GuidedLessonBlock>
    )

    const reading = container.firstElementChild
    expect(reading).not.toHaveClass('bg-[#FAF8F4]')
    expect(reading?.querySelectorAll('p')).toHaveLength(3)
    expect(screen.getByText('Carl Johnson')).toBeVisible()
    expect(screen.getByText(/My name is Carl Johnson and I am 32 years old/)).toBeVisible()
    expect(screen.getByRole('link', { name: 'Read more' })).toHaveAttribute('target', '_blank')
    expect(container.querySelector('script')).toBeNull()
  })

  it('keeps plain guided reading transparent at the guide body size', () => {
    const { container } = render(
      <GuidedLessonBlock
        block={{
          id: 'plain-reading',
          type: 'text',
          order: 0,
          format: 'plain',
          content: 'Carl Johnson\nMy name is Carl Johnson.',
        }}
      >
        fallback
      </GuidedLessonBlock>
    )

    const reading = container.firstElementChild
    expect(reading).toHaveClass('whitespace-pre-wrap', 'text-base', 'leading-6', 'text-[#10245C]')
    expect(reading).not.toHaveClass('bg-[#FAF8F4]')
    expect(reading).toHaveTextContent('Carl Johnson')
    expect(reading).toHaveTextContent('My name is Carl Johnson.')
  })

  it('keeps every table header and row without adding a technical heading', () => {
    render(
      <GuidedLessonBlock
        block={{
          id: 'table',
          type: 'structured-content',
          order: 0,
          title: 'Tabla',
          subtitle: 'Reference forms',
          content: {
            headers: ['Pronoun', 'Form'],
            rows: [
              ['I', 'am'],
              ['They', 'are'],
            ],
          },
        }}
      >
        fallback
      </GuidedLessonBlock>
    )

    expect(screen.getByRole('table', { name: 'Tabla' })).toBeVisible()
    expect(screen.getByText('Reference forms')).toBeVisible()
    expect(screen.getByText('Pronoun')).toBeVisible()
    expect(screen.getByText('They')).toBeVisible()
    expect(screen.queryByRole('heading', { name: 'Tabla' })).not.toBeInTheDocument()
  })

  it('uses the interactive fallback for vocabulary that has item media', () => {
    render(
      <GuidedLessonBlock
        block={{
          id: 'vocab',
          type: 'vocabulary',
          order: 0,
          title: 'Vocabulario',
          items: [
            {
              id: 'term',
              term: 'listen',
              definition: 'to pay attention to sound',
              audioUrl: '/listen.mp3',
            },
          ],
        }}
      >
        <button type="button">Interactive vocabulary</button>
      </GuidedLessonBlock>
    )

    expect(screen.getByRole('button', { name: 'Interactive vocabulary' })).toBeVisible()
  })

  it('suppresses editor-only headings when the viewer already owns the task heading', () => {
    expect(isTechnicalGuidedTitle('Nuevo Visualizador Gramatical')).toBe(true)
    expect(isTechnicalGuidedTitle('Tabla')).toBe(true)

    const { rerender } = render(
      <GuidedLessonBlock
        block={{ id: 'title', type: 'title', order: 0, title: 'Nuevo Visualizador Gramatical' }}
      >
        fallback
      </GuidedLessonBlock>
    )
    expect(screen.queryByText('Nuevo Visualizador Gramatical')).not.toBeInTheDocument()

    rerender(
      <GuidedLessonBlock
        block={{ id: 'title', type: 'title', order: 0, title: 'Completa la presentación' }}
        suppressHeading
      >
        fallback
      </GuidedLessonBlock>
    )
    expect(screen.queryByRole('heading', { name: 'Completa la presentación' })).not.toBeInTheDocument()
  })
})
