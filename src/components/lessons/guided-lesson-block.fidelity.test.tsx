import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { GuidedLessonBlock } from './guided-lesson-block'

describe('guided lesson visual language fidelity', () => {
  it('renders every authored vocabulary fact as a compact editorial card without invented controls', () => {
    const items = [
      ['name', 'Name', 'Peter'],
      ['family', 'Family Name', 'Smith'],
      ['occupation', 'Occupation', 'Teacher'],
      ['spelling', 'Spelling', 'P-E-T-E-R'],
      ['age', 'Age', '20 years old'],
      ['origin', 'Origin', 'The US'],
      ['address', 'Address', 'Lincoln Avenue, 23rd'],
      ['phone', 'Phone/Mail', '01 154 8593'],
      ['marital', 'Marital Status', 'I am married but Jake is single'],
    ].map(([id, term, definition]) => ({ id, term, definition }))

    const { container } = render(
      <GuidedLessonBlock
        block={{ id: 'vocabulary', type: 'vocabulary', order: 0, title: 'Vocabulario', items }}
      >
        fallback
      </GuidedLessonBlock>
    )

    const cards = container.querySelectorAll('[data-guided-vocabulary-card]')
    expect(cards).toHaveLength(9)
    expect(container.querySelector('[data-guided-vocabulary] > dl')).toHaveClass('flex')
    expect(container.querySelector('.grid')).toBeNull()
    expect(container.querySelectorAll('button')).toHaveLength(0)
    expect(screen.getByText('Family Name')).toBeVisible()
    expect(screen.getByText('I am married but Jake is single')).toBeVisible()
    expect(cards[0]).toContainHTML('<svg')
    expect(cards[2]).toContainHTML('<svg')
  })

  it('keeps table semantics and all five reference rows inside the paper treatment', () => {
    render(
      <GuidedLessonBlock
        block={{
          id: 'table',
          type: 'structured-content',
          order: 0,
          title: 'Conjugación de Verbos - To Be',
          subtitle: 'Presente Simple',
          content: {
            headers: ['Pronombre', 'Verbo'],
            rows: [
              ['I', 'am'],
              ['You', 'are'],
              ['He/She/It', 'is'],
              ['We', 'are'],
              ['They', 'are'],
            ],
          },
        }}
      >
        fallback
      </GuidedLessonBlock>
    )

    const table = screen.getByRole('table', { name: 'Conjugación de Verbos - To Be' })
    expect(table.closest('[data-guided-table]')).toHaveClass('rounded-[24px]', 'bg-white')
    expect(table.querySelectorAll('thead th')).toHaveLength(2)
    expect(table.querySelectorAll('tbody tr')).toHaveLength(5)
    expect(screen.getByText('They')).toBeVisible()
    expect(
      screen.queryByRole('heading', { name: 'Conjugación de Verbos - To Be' })
    ).not.toBeInTheDocument()
  })

  it('shows the authored grammar transformation and keeps the negative variant below it', () => {
    const { container } = render(
      <GuidedLessonBlock
        block={{
          id: 'grammar',
          type: 'grammar-visualizer',
          order: 0,
          title: 'Nuevo Visualizador Gramatical',
          sets: [
            {
              id: 'to-be',
              title: 'Presente Simple - To Be',
              variants: [
                {
                  id: 'affirmative',
                  label: 'Afirmativo',
                  rawSentence: 'I am Lucas',
                  tokens: [
                    { id: 'i', content: 'I', grammarType: 'subject' },
                    { id: 'am', content: 'am', grammarType: 'linking-verb' },
                    { id: 'lucas', content: 'Lucas', grammarType: 'subject-complement' },
                  ],
                },
                {
                  id: 'question',
                  label: 'Interrogativo',
                  rawSentence: 'Are you Lucas?',
                  tokens: [],
                  hint: 'El verbo va primero.',
                },
                {
                  id: 'negative',
                  label: 'Negativo',
                  rawSentence: 'I am not Lucas',
                  tokens: [
                    { id: 'i-negative', content: 'I', grammarType: 'subject' },
                    { id: 'am-negative', content: 'am', grammarType: 'linking-verb' },
                    { id: 'not', content: 'not', grammarType: 'negation' },
                    { id: 'lucas-negative', content: 'Lucas', grammarType: 'subject-complement' },
                  ],
                },
              ],
            },
          ],
        }}
      >
        fallback
      </GuidedLessonBlock>
    )

    expect(container.querySelector('[data-guided-grammar-transition]')).toHaveClass('flex')
    expect(container.querySelector('[data-guided-grammar-arrow]')).toBeInTheDocument()
    expect(container.querySelector('[data-guided-grammar-negative]')).toBeInTheDocument()
    expect(container.querySelectorAll('[data-guided-grammar-variant]')).toHaveLength(3)
    expect(screen.getByText('not', { exact: true })).toHaveClass('text-[#C13E50]')
    expect(container.querySelectorAll('.text-\\[\\#08775E\\]')).toHaveLength(2)
    expect(screen.getByText('El verbo va primero.')).toBeVisible()
    expect(screen.getByText('Are you Lucas?')).toHaveClass('text-2xl')
    expect(container.querySelector('.grid')).toBeNull()
  })
})
