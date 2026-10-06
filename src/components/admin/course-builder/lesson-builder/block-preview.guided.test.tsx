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
})
