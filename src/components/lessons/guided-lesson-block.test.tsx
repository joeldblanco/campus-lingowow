import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { GuidedLessonBlock } from './guided-lesson-block'

describe('guided content presentation', () => {
  it('preserves actual vocabulary values rather than mockup names', () => {
    render(<GuidedLessonBlock block={{ id: 'vocab', type: 'vocabulary', order: 0, title: 'Vocabulario', items: [{ id: 'name', term: 'Name', definition: 'Peter', pronunciation: 'P-E-T-E-R' }] }}>fallback</GuidedLessonBlock>)
    expect(screen.getByText('Peter')).toBeInTheDocument()
    expect(screen.getByText('P-E-T-E-R')).toBeInTheDocument()
    expect(screen.queryByText('Lucas')).not.toBeInTheDocument()
  })

  it('shows every grammar variant and its authored hint without tabs', () => {
    render(<GuidedLessonBlock block={{ id: 'grammar', type: 'grammar-visualizer', order: 0, sets: [{ id: 'set', title: 'To be', variants: [
      { id: 'yes', label: 'Afirmativo', rawSentence: 'I am Lucas', tokens: [] },
      { id: 'question', label: 'Interrogativo', rawSentence: 'Are you Lucas?', tokens: [], hint: 'Authored hint' },
      { id: 'no', label: 'Negativo', rawSentence: 'I am not Lucas', tokens: [] },
    ] }] }}>fallback</GuidedLessonBlock>)
    expect(screen.getByText('I am Lucas')).toBeVisible()
    expect(screen.getByText('Are you Lucas?')).toBeVisible()
    expect(screen.getByText('I am not Lucas')).toBeVisible()
    expect(screen.getByText('Authored hint')).toBeVisible()
    expect(screen.queryByRole('tab')).not.toBeInTheDocument()
  })

  it('preserves the full reading and strips unsafe markup', () => {
    const { container } = render(<GuidedLessonBlock block={{ id: 'reading', type: 'text', order: 0, content: '<p>Carl works in The Amazon.</p><p>Our house is in Sao Paulo.</p><script>alert(1)</script>' }}>fallback</GuidedLessonBlock>)
    expect(screen.getByText('Carl works in The Amazon.')).toBeInTheDocument()
    expect(screen.getByText('Our house is in Sao Paulo.')).toBeInTheDocument()
    expect(container.querySelector('script')).toBeNull()
  })

  it('keeps interactive exercises on their original renderer', () => {
    render(<GuidedLessonBlock block={{ id: 'essay', type: 'essay', order: 0, prompt: 'Original' }}><button>Original evaluation</button></GuidedLessonBlock>)
    expect(screen.getByRole('button', { name: 'Original evaluation' })).toBeVisible()
  })
})
