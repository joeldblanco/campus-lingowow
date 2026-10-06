import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BlockPreview } from './block-preview'

vi.mock('@/components/lessons/essay-ai-grading', () => ({
  EssayAIGrading: () => <button type="button">Enviar</button>,
}))
vi.mock('@/components/lessons/recording-ai-grading', () => ({
  RecordingAIGrading: () => <button type="button">Obtener Retroalimentación</button>,
}))
vi.mock('@/lib/actions/ai-grading-limits', () => ({
  canUseAIGrading: vi.fn(),
  recordAIGradingUsage: vi.fn(),
}))

afterEach(() => cleanup())

describe('BlockPreview guided appearance', () => {
  it('suppresses repeated labels and titles while preserving authored prompts', () => {
    render(
      <>
        <BlockPreview
          guidedAppearance
          block={{
            id: 'audio',
            type: 'audio',
            order: 0,
            title: 'Listen to the conversation',
            url: '/conversation.mp3',
          }}
        />
        <BlockPreview
          guidedAppearance
          block={{
            id: 'true-false',
            type: 'true_false',
            order: 1,
            title: 'True or false practice',
            items: [{ id: 'statement', statement: 'Lucas lives in Lima.', correctAnswer: true }],
          }}
        />
        <BlockPreview
          guidedAppearance
          block={{ id: 'essay', type: 'essay', order: 2, prompt: 'Write about your routine.' }}
        />
        <BlockPreview
          guidedAppearance
          block={{
            id: 'recording',
            type: 'recording',
            order: 3,
            instruction: 'Record a short introduction.',
            aiGrading: false,
          }}
        />
      </>
    )

    expect(screen.queryByText('Pronunciación')).not.toBeInTheDocument()
    expect(screen.queryByText('Verdadero o Falso')).not.toBeInTheDocument()
    expect(screen.queryByText('True or false practice')).not.toBeInTheDocument()
    expect(screen.queryByText('Ensayo')).not.toBeInTheDocument()
    expect(screen.queryByText('Grabación')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Listen to the conversation' })
    ).not.toBeInTheDocument()

    expect(screen.getByText('Lucas lives in Lima.')).toHaveClass('text-base', 'leading-6')
    expect(screen.getByText('Write about your routine.')).toHaveClass('text-base', 'leading-6')
    expect(screen.getByText('Record a short introduction.')).toHaveClass('text-base', 'leading-6')
    expect(screen.getByRole('button', { name: 'Reproducir audio' })).toBeInTheDocument()
  })

  it('keeps the default renderer appearance when guided mode is omitted', () => {
    render(
      <BlockPreview
        block={{
          id: 'true-false',
          type: 'true_false',
          order: 0,
          title: 'True or false practice',
          items: [{ id: 'statement', statement: 'Lucas lives in Lima.', correctAnswer: true }],
        }}
      />
    )

    expect(screen.getByText('Verdadero o Falso')).toBeInTheDocument()
    expect(screen.getByText('True or false practice')).toBeInTheDocument()
  })

  it('keeps true/false selection neutral and preserves check behavior', () => {
    const target = document.createElement('div')
    document.body.appendChild(target)
    const onGuidedActionPresence = vi.fn()

    render(
      <BlockPreview
        guidedAppearance
        guidedActionTarget={target}
        onGuidedActionPresence={onGuidedActionPresence}
        block={{
          id: 'true-false',
          type: 'true_false',
          order: 0,
          items: [{ id: 'statement', statement: 'Lucas lives in Lima.', correctAnswer: true }],
        }}
      />
    )

    const trueButton = screen.getByRole('button', { name: 'Verdadero' })
    const falseButton = screen.getByRole('button', { name: 'Falso' })
    expect(trueButton).toHaveAttribute('aria-pressed', 'false')
    expect(falseButton).toHaveAttribute('aria-pressed', 'false')
    expect(trueButton.className).not.toMatch(/green|red/)
    expect(falseButton.className).not.toMatch(/green|red/)

    const disabledCheckButton = target.querySelector('button')
    expect(disabledCheckButton).toHaveTextContent('Comprobar')
    expect(disabledCheckButton).toBeDisabled()
    expect(onGuidedActionPresence).toHaveBeenLastCalledWith(true)

    fireEvent.click(trueButton)
    expect(trueButton).toHaveAttribute('aria-pressed', 'true')
    expect(falseButton).toHaveAttribute('aria-pressed', 'false')

    const checkButton = target.querySelector('button')
    expect(checkButton).toHaveTextContent('Comprobar')
    fireEvent.click(checkButton as HTMLButtonElement)

    expect(screen.getByText('¡Correcto!')).toBeInTheDocument()
    expect(onGuidedActionPresence).toHaveBeenLastCalledWith(false)
  })

  it('moves the checked two-question flow to the footer action', () => {
    const target = document.createElement('div')
    document.body.appendChild(target)

    render(
      <BlockPreview
        guidedAppearance
        guidedActionTarget={target}
        block={{
          id: 'true-false',
          type: 'true_false',
          order: 0,
          items: [
            { id: 'first', statement: 'First statement.', correctAnswer: true },
            { id: 'second', statement: 'Second statement.', correctAnswer: false },
          ],
        }}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Verdadero' }))
    fireEvent.click(target.querySelector('button') as HTMLButtonElement)

    expect(target.querySelector('button')).toHaveTextContent('Siguiente')
    expect(screen.queryByRole('button', { name: 'Siguiente' })).toBeInTheDocument()
    fireEvent.click(target.querySelector('button') as HTMLButtonElement)

    expect(screen.getByText('Second statement.')).toBeInTheDocument()
    expect(target.querySelector('button')).toHaveTextContent('Comprobar')
    expect(target.querySelector('button')).toBeDisabled()
  })

  it('keeps the default matching renderer and labels when guided mode is omitted', () => {
    render(
      <BlockPreview
        block={{
          id: 'match',
          type: 'match',
          order: 0,
          title: 'Práctica de vocabulario',
          pairs: [{ id: 'name', left: 'Name', right: 'Peter' }],
        }}
      />
    )

    expect(screen.getByText('Emparejar')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Práctica de vocabulario' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Verificar' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reiniciar' })).toBeInTheDocument()
  })

  it('uses a compact guided matching stage, portals checking, and preserves all pairings', () => {
    const target = document.createElement('div')
    document.body.appendChild(target)
    const onGuidedActionPresence = vi.fn()

    render(
      <BlockPreview
        guidedAppearance
        guidedActionTarget={target}
        onGuidedActionPresence={onGuidedActionPresence}
        block={{
          id: 'match',
          type: 'match',
          order: 0,
          title: 'Práctica de vocabulario',
          pairs: [
            { id: 'name', left: 'Name', right: 'Peter' },
            { id: 'age', left: 'Age', right: '20 years old' },
          ],
        }}
      />
    )

    expect(screen.queryByText('Emparejar')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Práctica de vocabulario' })
    ).not.toBeInTheDocument()
    expect(screen.getByText('Toca una palabra y su pareja.')).toBeVisible()
    expect(screen.getAllByRole('button', { name: /Pareja:/ })).toHaveLength(2)
    expect(screen.getAllByRole('button', { name: /Pareja:/ })[0]).toHaveAttribute('type', 'button')
    expect(target.querySelector('button')).toHaveTextContent('Comprobar')
    expect(onGuidedActionPresence).toHaveBeenLastCalledWith(true)

    const firstChoice = screen.getByRole('button', { name: 'Pareja: Peter' })
    fireEvent.click(firstChoice)
    expect(firstChoice).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
    expect(screen.getByText('Age')).toBeVisible()
    const secondChoice = screen.getByRole('button', { name: 'Pareja: 20 years old' })
    fireEvent.keyDown(secondChoice, { key: 'Enter' })
    expect(secondChoice).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(target.querySelector('button') as HTMLButtonElement)
    expect(screen.getByText('¡Perfecto! Todos los pares están correctos')).toBeVisible()
    expect(onGuidedActionPresence).toHaveBeenLastCalledWith(false)

    fireEvent.click(screen.getByRole('button', { name: 'Reiniciar' }))
    expect(screen.getByText('Name')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Pareja: Peter' })).toHaveAttribute(
      'aria-pressed',
      'false'
    )
  })

  it('enforces one-to-one guided matches and supports keyboard clearing and reassignment', () => {
    const target = document.createElement('div')
    document.body.appendChild(target)

    render(
      <BlockPreview
        guidedAppearance
        guidedActionTarget={target}
        block={{
          id: 'match-unique',
          type: 'match',
          order: 0,
          pairs: [
            { id: 'first', left: 'First', right: 'Alpha' },
            { id: 'second', left: 'Second', right: 'Beta' },
            { id: 'third', left: 'Third', right: 'Gamma' },
          ],
        }}
      />
    )

    const beta = screen.getByRole('button', { name: 'Pareja: Beta' })
    fireEvent.click(beta)
    expect(beta).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
    const occupiedBeta = screen.getByRole('button', { name: 'Pareja: Beta' })
    expect(occupiedBeta).toBeDisabled()
    fireEvent.keyDown(occupiedBeta, { key: 'Enter' })
    expect(occupiedBeta).toHaveAttribute('aria-pressed', 'false')

    const gamma = screen.getByRole('button', { name: 'Pareja: Gamma' })
    fireEvent.keyDown(gamma, { key: ' ' })
    expect(gamma).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(screen.getByRole('button', { name: 'Anterior' }))
    const selectedBeta = screen.getByRole('button', { name: 'Pareja: Beta' })
    fireEvent.keyDown(selectedBeta, { key: 'Enter' })
    expect(selectedBeta).toHaveAttribute('aria-pressed', 'false')
    expect(selectedBeta).not.toBeDisabled()

    const alpha = screen.getByRole('button', { name: 'Pareja: Alpha' })
    fireEvent.keyDown(alpha, { key: ' ' })
    expect(alpha).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
    const reassignedBeta = screen.getByRole('button', { name: 'Pareja: Beta' })
    expect(reassignedBeta).not.toBeDisabled()
    fireEvent.keyDown(reassignedBeta, { key: 'Enter' })
    expect(reassignedBeta).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(target.querySelector('button') as HTMLButtonElement)
    expect(screen.getByText('2 de 3 pares correctos')).toBeVisible()
  })

  it('keeps fill-in and multiple-choice prompts compact and moves their primary actions', () => {
    const fillTarget = document.createElement('div')
    const choiceTarget = document.createElement('div')
    document.body.append(fillTarget, choiceTarget)

    render(
      <>
        <BlockPreview
          guidedAppearance
          guidedActionTarget={fillTarget}
          block={{
            id: 'to-be',
            type: 'fill_blanks',
            order: 0,
            title: 'Práctica: To Be',
            items: [{ id: 'be', content: 'I [am] a student.' }],
          }}
        />
        <BlockPreview
          guidedAppearance
          guidedActionTarget={choiceTarget}
          block={{
            id: 'possessives',
            type: 'multiple_choice',
            order: 1,
            items: [
              {
                id: 'poss-i',
                question: 'I am Peter. ___ name is Peter.',
                options: [
                  { id: 'my', text: 'My' },
                  { id: 'your', text: 'Your' },
                ],
                correctOptionId: 'my',
              },
            ],
          }}
        />
      </>
    )

    expect(screen.queryByText('Rellenar Espacios')).not.toBeInTheDocument()
    expect(screen.queryByText('Práctica: To Be')).not.toBeInTheDocument()
    expect(fillTarget.querySelector('button')).toHaveTextContent('Comprobar')

    const fillInput = screen.getByRole('textbox', { name: 'Respuesta 2' })
    expect(fillInput).toHaveClass('min-h-11', 'text-base')
    expect(fillInput.className).not.toMatch(/green|red/)
    fireEvent.change(fillInput, { target: { value: 'am' } })
    fireEvent.click(fillTarget.querySelector('button') as HTMLButtonElement)
    expect(fillInput).toBeDisabled()

    expect(screen.getByText('I am Peter. ___ name is Peter.')).toHaveClass('text-base', 'leading-6')
    expect(screen.queryByText('Opción Múltiple')).not.toBeInTheDocument()
    expect(choiceTarget.querySelector('button')).toHaveTextContent('Comprobar')
    expect(choiceTarget.querySelector('button')).toBeDisabled()

    const myChoice = screen.getByRole('button', { name: 'My' })
    fireEvent.click(myChoice)
    expect(myChoice).toHaveAttribute('aria-pressed', 'true')
    expect(myChoice.className).not.toMatch(/green|red/)
    expect(choiceTarget.querySelector('button')).not.toBeDisabled()
  })
})
