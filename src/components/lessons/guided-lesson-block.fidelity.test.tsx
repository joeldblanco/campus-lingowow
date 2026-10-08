import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { GuidedLessonBlock } from './guided-lesson-block'

describe('guided lesson visual language fidelity', () => {
  it('keeps explicitly authored group notes outside the scrolling table', () => {
    render(<GuidedLessonBlock block={{
      id: 'group-note', type: 'structured-content', order: 0, title: 'Reference',
      content: { headers: ['A', 'B', 'C'], rows: [['one', 'two', 'three']] },
      data: { tableGroups: [{ key: 'reference', sourceHeader: 'Reference group', headers: ['A', 'B', 'C'], rows: [['one', 'two', 'three']], notes: ['Keep this explanation visible.'] }] },
    }}>fallback</GuidedLessonBlock>)
    const scrollingRegion = screen.getByRole('table', { name: 'Reference group' }).parentElement!
    expect(scrollingRegion).toHaveClass('overflow-x-auto')
    expect(scrollingRegion).not.toContainElement(screen.getByText('Keep this explanation visible.'))
    expect(scrollingRegion).not.toContainElement(screen.getByText('Desliza para ver la tabla →'))
  })
  it('keeps explanations and the scroll hint outside a wide table scrolling region', () => {
    render(
      <GuidedLessonBlock block={{
        id: 'wide-reference', type: 'structured-content', order: 0,
        title: 'Expressions', subtitle: 'Read the meaning before reviewing the examples.',
        content: { headers: ['Phrase', 'Meaning', 'Example'], rows: [['Never say die', 'Keep trying', 'Never say die.']] },
      }}>fallback</GuidedLessonBlock>
    )
    const table = screen.getByRole('table', { name: 'Expressions' })
    const scrollingRegion = table.parentElement!
    expect(scrollingRegion).toHaveClass('overflow-x-auto')
    expect(scrollingRegion).not.toContainElement(screen.getByText('Read the meaning before reviewing the examples.'))
    expect(scrollingRegion).not.toContainElement(screen.getByText('Desliza para ver la tabla →'))
  })
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

  it('renders explicitly authored table groups as readable two-column panels', () => {
    const toBeExplanation = 'Use To Be to describe identity, origin, and location.'
    const otherVerbsExplanation = 'Use do or does to form questions with other verbs.'

    const { container } = render(
      <GuidedLessonBlock
        block={{
          id: 'unit2-reference',
          type: 'structured-content',
          order: 0,
          title: 'Language reference',
          subtitle: 'Presente Simple',
          content: {
            headers: ['To Be verb', '', 'Other verbs – Auxiliary Introduction', ''],
            rows: [
              ['John is American', 'Is he American?', 'She comes from England.', 'Does she come from England?'],
              ['They are from Mexico', 'Where are they from?', 'You speak Italian', 'Do you speak Italian?'],
              [toBeExplanation, '', otherVerbsExplanation, ''],
            ],
          },
          data: {
            tableGroups: [
              {
                key: 'to-be',
                sourceHeader: 'To Be verb',
                headers: ['To Be verb', ''],
                rows: [
                  ['John is American', 'Is he American?'],
                  ['They are from Mexico', 'Where are they from?'],
                  [toBeExplanation, ''],
                ],
              },
              {
                key: 'other-verbs',
                sourceHeader: 'Other verbs – Auxiliary Introduction',
                headers: ['Other verbs – Auxiliary Introduction', ''],
                rows: [
                  ['She comes from England.', 'Does she come from England?'],
                  ['You speak Italian', 'Do you speak Italian?'],
                  [otherVerbsExplanation, ''],
                ],
              },
            ],
          },
        }}
      >
        fallback
      </GuidedLessonBlock>
    )

    expect(container.querySelector('[data-guided-table-grouped]')).toBeInTheDocument()
    expect(container.querySelectorAll('[data-guided-table-group]')).toHaveLength(2)
    expect(container.querySelector('[data-guided-table-group="to-be"]')).toBeInTheDocument()
    expect(container.querySelector('[data-guided-table-group="other-verbs"]')).toBeInTheDocument()
    expect(container.querySelectorAll('[data-guided-table-group] table')).toHaveLength(2)
    expect(screen.getByRole('table', { name: 'To Be verb' })).toBeVisible()
    expect(screen.getByRole('table', { name: 'Other verbs – Auxiliary Introduction' })).toBeVisible()
    expect(screen.getByText(toBeExplanation)).toBeVisible()
    expect(screen.getByText(otherVerbsExplanation)).toBeVisible()
    expect(container.querySelectorAll('[data-guided-table-group] thead th')).toHaveLength(4)
    expect(container.querySelector('[data-guided-table-panels]')).toHaveClass('space-y-4')
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
  })

  it('keeps a numbered source column narrow while preserving its authored rows', () => {
    render(
      <GuidedLessonBlock
        block={{
          id: 'unit2-functions',
          type: 'structured-content',
          order: 0,
          title: 'Functions and Examples',
          content: {
            headers: ['', 'Functions', 'Examples'],
            rows: [
              ['1', 'Talk about origins.', 'I am from Spain.'],
              ['2', 'State nationalities.', 'She is Spanish.'],
              ['3', 'Talk about language.', 'We speak English.'],
            ],
          },
        }}
      >
        fallback
      </GuidedLessonBlock>
    )

    const table = screen.getByRole('table', { name: 'Functions and Examples' })
    expect(table.querySelector('thead th:first-child')).toHaveClass('w-12', 'min-w-12')
    expect(table.querySelector('tbody td:first-child')).toHaveClass('w-12', 'min-w-12')
    expect(table.querySelectorAll('tbody tr')).toHaveLength(3)
    expect(screen.getByText('3')).toBeVisible()
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
