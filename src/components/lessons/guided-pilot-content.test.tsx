import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useState } from 'react'
import { GuidedLessonViewer } from './guided-lesson-viewer'
import type { Block } from '@/types/course-builder'

vi.mock('next/image', () => ({ default: ({ src }: { src: string }) => <div data-testid="illustration">{src}</div> }))
vi.mock('@/components/admin/course-builder/lesson-builder/block-preview', () => ({
  BlockPreview: function Preview({ block }: { block: Block }) {
    const [value, setValue] = useState('')
    return block.type === 'essay' ? <textarea aria-label="Mi perfil" value={value} onChange={(event) => setValue(event.target.value)} /> : <span>Control original: {block.type}</span>
  },
}))

const blocks: Block[] = [
  { id: 'audio', type: 'audio', order: 0, url: '/original.wav' },
  { id: 'vocabulary', type: 'vocabulary', order: 1, title: 'Vocabulario', items: [{ id: 'name', term: 'Name', definition: 'Peter' }] },
  { id: 'table', type: 'structured-content', order: 2, title: 'To be', content: { headers: ['Pronombre', 'Verbo'], rows: [['I', 'am']] } },
  { id: 'grammar', type: 'grammar-visualizer', order: 3, sets: [{ id: 'set', title: 'To be', variants: [{ id: 'one', label: 'Afirmativo', rawSentence: 'I am Lucas', tokens: [] }] }] },
  { id: 'possessives', type: 'structured-content', order: 4, title: 'Adjetivos Posesivos', content: { headers: ['Pronombre', 'Posesivo'], rows: [['They', 'Their']] } },
  { id: 'practice-title', type: 'title', order: 5, title: "Let's practice!" },
  { id: 'practice-audio', type: 'audio', order: 6, url: '/practice.wav' },
  { id: 'exercise', type: 'true_false', order: 7, items: [] },
  { id: 'reading', type: 'text', order: 8, content: '<p>Carl Johnson works in The Amazon.</p>' },
  { id: 'recording', type: 'recording', order: 9, prompt: 'Original instruction' },
  { id: 'essay', type: 'essay', order: 10, prompt: 'Original essay' },
]

beforeEach(() => sessionStorage.clear())

describe('illustrated pilot content', () => {
  it('keeps the actual names and references, with Carl only on the reading step', () => {
    render(<GuidedLessonViewer blocks={blocks} storageKey="pilot-content" illustratedContent />)
    expect(screen.getByText('Peter')).toBeVisible()
    expect(screen.getByText('1/7')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
    expect(screen.getByText('I am Lucas')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
    expect(screen.getByText('Their')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
    expect(screen.getByText('Control original: true_false')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
    expect(screen.getByText('Carl Johnson works in The Amazon.')).toBeVisible()
    expect(screen.getByTestId('illustration')).toHaveTextContent('/carl.png')
  })

  it('retains an essay draft when returning to the speaking step and back', () => {
    render(<GuidedLessonViewer blocks={blocks} storageKey="pilot-draft" illustratedContent />)
    for (let index = 0; index < 6; index++) fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Mi perfil' }), { target: { value: 'My name is Ana.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Atrás' }))
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
    expect(screen.getByRole('textbox', { name: 'Mi perfil' })).toHaveValue('My name is Ana.')
  })
})
