import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BlockPreview, buildGuidedOrderingItems, isOrderingCorrect } from './block-preview'

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
  it('lets an authored scene provide the instruction without repeating its technical header', () => {
    render(<BlockPreview block={orderingBlock} guidedAppearance hideBlockHeader />)
    expect(screen.queryByText('Ordenar')).not.toBeInTheDocument()
    expect(screen.queryByText(orderingBlock.instruction!)).not.toBeInTheDocument()
    expect(screen.getAllByTestId('guided-ordering-item')).toHaveLength(3)
  })
  it('accepts interchangeable repeated letters and never presents their correct text order initially', () => {
    const letters = [
      { id: 'a-first', text: 'A', correctPosition: 1 },
      { id: 'n', text: 'N', correctPosition: 2 },
      { id: 'a-last', text: 'A', correctPosition: 3 },
    ]
    expect(isOrderingCorrect([letters[2], letters[1], letters[0]])).toBe(true)
    expect(isOrderingCorrect([letters[1], letters[0], letters[2]])).toBe(false)
    for (const seed of ['letters-one', 'letters-two', 'letters-three']) {
      expect(isOrderingCorrect(buildGuidedOrderingItems(letters, seed))).toBe(false)
    }
  })
  it('uses a deterministic shuffled fixture that cannot start complete', () => {
    const first = buildGuidedOrderingItems(orderingBlock.items, orderingBlock.id)
    const second = buildGuidedOrderingItems(orderingBlock.items, orderingBlock.id)

    expect(first.map((item) => item.id)).toEqual(second.map((item) => item.id))
    expect(first.map((item) => item.id)).not.toEqual(['first', 'middle', 'last'])
  })

  it('completes automatically on the last move and keeps one reset CTA in the footer', async () => {
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
    expect(target.querySelector('button')).toHaveTextContent('Reiniciar orden')
    expect(screen.queryByRole('button', { name: 'Comprobar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(onCompletion).not.toHaveBeenCalledWith(true)

    const desiredOrder = ['first', 'middle', 'last']
    const textById = { first: 'First', middle: 'Middle', last: 'Last' }
    for (let desiredIndex = 0; desiredIndex < desiredOrder.length; desiredIndex += 1) {
      let currentOrder = screen
        .getAllByTestId('guided-ordering-item')
        .map((item) => item.getAttribute('data-guided-ordering-item'))
      let currentIndex = currentOrder.indexOf(desiredOrder[desiredIndex])

      while (currentIndex > desiredIndex) {
        fireEvent.click(screen.getByRole('button', { name: `Subir ${textById[desiredOrder[desiredIndex] as keyof typeof textById]}` }))
        currentIndex -= 1
        currentOrder = screen
          .getAllByTestId('guided-ordering-item')
          .map((item) => item.getAttribute('data-guided-ordering-item'))
      }

      while (currentIndex < desiredIndex) {
        fireEvent.click(screen.getByRole('button', { name: `Bajar ${textById[desiredOrder[desiredIndex] as keyof typeof textById]}` }))
        currentIndex += 1
        currentOrder = screen
          .getAllByTestId('guided-ordering-item')
          .map((item) => item.getAttribute('data-guided-ordering-item'))
      }
    }

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('¡Correcto!')
      expect(onCompletion).toHaveBeenLastCalledWith(true)
      expect(target.querySelector('button')).toBeNull()
      expect(onPresence).toHaveBeenLastCalledWith(false)
    })

    expect(screen.getAllByTestId('guided-ordering-item').every((item) => item.className.includes('bg-[#F2FBF7]'))).toBe(true)
  })

  it('keeps the classic ordering action when guided appearance is disabled', () => {
    render(<BlockPreview block={orderingBlock} />)

    expect(screen.getByText('Ordenar')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Verificar' })).toBeInTheDocument()
  })
})
