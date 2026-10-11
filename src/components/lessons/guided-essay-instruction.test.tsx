import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BlockPreview } from '@/components/admin/course-builder/lesson-builder/block-preview'
import type { EssayBlock } from '@/types/course-builder'

vi.mock('@/lib/actions/ai-grading-limits', () => ({ canUseAIGrading: vi.fn(), recordAIGradingUsage: vi.fn() }))
vi.mock('@/components/lessons/essay-ai-grading', () => ({
  EssayAIGrading: ({ prompt, targetLevel }: { prompt: string; targetLevel?: string }) =>
    <button data-testid="grading" data-prompt={prompt} data-level={targetLevel}>Enviar</button>,
}))
afterEach(cleanup)

const block: EssayBlock = {
  id: '2f05bcbc-d5c9-4cbc-9a80-849d1d20b563', type: 'essay', order: 0,
  prompt: 'Escribe un perfil de 30-50 palabras similar a la lectura donde uses tu propia información.',
  minWords: 30, maxWords: 50, aiGrading: false, aiGradingConfig: { language: 'english', targetLevel: 'A1' },
}

describe('guided profile writing instruction', () => {
  it('uses the new A1 pilot task and its short response limits instead of the legacy profile', () => {
    render(<BlockPreview guidedAppearance block={{ ...block, prompt: 'Confirma el horario de la tarjeta en dos frases.', minWords: 5, maxWords: 80,
      data: { unit1Role: 'profile', pilotRevision: 'a1-module1-pilot-v1', reviewChecklist: ['Confirmé la hora.'] } }} />)
    expect(screen.getByRole('textbox', { name: 'Confirma el horario de la tarjeta en dos frases.' })).toBeVisible()
    expect(screen.getByText('Mínimo 5 palabras')).toBeVisible()
    expect(screen.getByText('Máx 80')).toBeVisible()
    expect(screen.queryByText('Mínimo 30 palabras')).not.toBeInTheDocument()
    expect(screen.queryByText('Ver ejemplo')).not.toBeInTheDocument()
  })
  it('sends the displayed instruction and the configured level to grading', () => {
    render(<BlockPreview guidedAppearance block={{ ...block, aiGrading: true }} />)
    expect(screen.getByTestId('grading')).toHaveAttribute('data-level', 'A1')
    expect(screen.getByTestId('grading')).toHaveAttribute('data-prompt', screen.getByText(/Escribe en inglés un perfil/).textContent)
    expect(screen.queryByText('Nivel: A1')).not.toBeInTheDocument()
  })
  it('provides a self-contained instruction and hides level metadata in the guided view', () => {
    render(<BlockPreview guidedAppearance block={block} />)
    expect(screen.getByRole('textbox', { name: 'Escribe en inglés un perfil de 30–50 palabras con tu nombre, edad, origen, ocupación y dónde vives.' })).toBeVisible()
    expect(screen.queryByText(/Nivel:/)).not.toBeInTheDocument()
    expect(screen.queryByText(/similar a la lectura/)).not.toBeInTheDocument()
    expect(screen.getByText('Mínimo 30 palabras')).toBeVisible()
    expect(screen.getByText('Máx 50')).toBeVisible()
  })

  it('preserves classic presentation and teacher-authored replacement instructions', () => {
    const { rerender } = render(<BlockPreview block={block} />)
    expect(screen.getByText('Nivel: A1')).toBeVisible()
    expect(screen.getByText(block.prompt!)).toBeVisible()
    rerender(<BlockPreview guidedAppearance block={{ ...block, prompt: 'Describe tu rutina de trabajo.' }} />)
    expect(screen.getByRole('textbox', { name: 'Describe tu rutina de trabajo.' })).toBeVisible()
  })
})
