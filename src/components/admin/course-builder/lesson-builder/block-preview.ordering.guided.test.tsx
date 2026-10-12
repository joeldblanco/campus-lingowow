import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BlockPreview } from './block-preview'

vi.mock('@/lib/actions/ai-grading-limits', () => ({
  canUseAIGrading: vi.fn(),
  recordAIGradingUsage: vi.fn(),
}))

vi.mock('@/components/lessons/essay-ai-grading', () => ({
  EssayAIGrading: () => null,
}))

vi.mock('@/components/lessons/recording-ai-grading', () => ({
  RecordingAIGrading: () => null,
}))

afterEach(() => {
  cleanup()
})

const orderingBlock = {
  id: 'guided-ordering',
  type: 'ordering' as const,
  order: 0,
  instruction: 'Ordena la presentación.',
  items: [
    { id: 'last', text: 'Last', correctPosition: 3 },
    { id: 'first', text: 'First', correctPosition: 1 },
    { id: 'middle', text: 'Middle', correctPosition: 2 },
  ],
}

describe('guided ordering preview', () => {
  it('checks the complete order from the footer and reports completion only when correct', () => {
    const target = document.createElement('div')
    document.body.appendChild(target)
    const onPresence = vi.fn()
    const onCompletion = vi.fn()

    render(
      <BlockPreview
        block={orderingBlock}
        guidedAppearance
        guidedActionTarget={target}
        onGuidedActionPresence={onPresence}
        onGuidedCompletionChange={onCompletion}
      />
    )

    expect(onPresence).toHaveBeenLastCalledWith(true)
    expect(target.querySelector('button')).toHaveTextContent('Comprobar')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Bajar Last' }))
    fireEvent.click(screen.getByRole('button', { name: 'Bajar Last' }))
    expect(target.querySelector('button')).toHaveTextContent('Comprobar')
    expect(onCompletion).not.toHaveBeenCalledWith(true)

    fireEvent.click(target.querySelector('button') as HTMLButtonElement)
    expect(screen.getByRole('status')).toHaveTextContent('¡Correcto!')
    expect(onCompletion).toHaveBeenLastCalledWith(true)
    expect(target.querySelector('button')).toBeNull()
    expect(onPresence).toHaveBeenLastCalledWith(false)
  })

  it('keeps the classic ordering action when guided appearance is disabled', () => {
    render(<BlockPreview block={orderingBlock} />)

    expect(screen.getByText('Ordenar')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Verificar' })).toBeInTheDocument()
  })
})
