import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  BlockPreview,
  GUIDED_MATCH_CORRECT_FEEDBACK_MS,
  GUIDED_MATCH_WRONG_FEEDBACK_MS,
} from './block-preview'

vi.mock('@/components/lessons/essay-ai-grading', () => ({
  EssayAIGrading: ({
    label = 'Enviar',
    onGraded,
    onGradingStateChange,
  }: {
    label?: string
    onGraded?: () => void
    onGradingStateChange?: (state: 'loading' | 'success' | 'error') => void
  }) => (
    <button
      type="button"
      onClick={() => {
        onGradingStateChange?.('success')
        onGraded?.()
      }}
    >
      {label}
    </button>
  ),
}))
vi.mock('@/components/lessons/recording-ai-grading', () => ({
  RecordingAIGrading: ({
    onGraded,
    onGradingStateChange,
  }: {
    onGraded?: () => void
    onGradingStateChange?: (state: 'loading' | 'success' | 'error') => void
  }) => (
    <button
      type="button"
      onClick={() => {
        onGradingStateChange?.('success')
        onGraded?.()
      }}
    >
      Obtener Retroalimentación
    </button>
  ),
}))
vi.mock('@/lib/actions/ai-grading-limits', () => ({
  canUseAIGrading: vi.fn(),
  recordAIGradingUsage: vi.fn(),
}))

afterEach(() => {
  vi.useRealTimers()
  cleanup()
})

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

  it('hydrates guided audio duration from an already-loaded media element', () => {
    const durationDescriptor = Object.getOwnPropertyDescriptor(
      HTMLMediaElement.prototype,
      'duration'
    )
    const readyStateDescriptor = Object.getOwnPropertyDescriptor(
      HTMLMediaElement.prototype,
      'readyState'
    )

    Object.defineProperty(HTMLMediaElement.prototype, 'duration', {
      configurable: true,
      get: () => 24.85,
    })
    Object.defineProperty(HTMLMediaElement.prototype, 'readyState', {
      configurable: true,
      get: () => 1,
    })

    try {
      render(
        <BlockPreview
          guidedAppearance
          block={{ id: 'loaded-audio', type: 'audio', order: 0, url: '/lesson.mp3' }}
        />
      )

      expect(screen.getByText('0:24')).toBeInTheDocument()
    } finally {
      if (durationDescriptor) {
        Object.defineProperty(HTMLMediaElement.prototype, 'duration', durationDescriptor)
      }
      if (readyStateDescriptor) {
        Object.defineProperty(HTMLMediaElement.prototype, 'readyState', readyStateDescriptor)
      }
    }
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

    expect(target.querySelector('button')).toHaveTextContent('Siguiente pregunta')
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

  it('reports completion only after every true/false question has been checked', () => {
    const target = document.createElement('div')
    const onGuidedCompletionChange = vi.fn()
    document.body.appendChild(target)

    render(
      <BlockPreview
        guidedAppearance
        guidedActionTarget={target}
        onGuidedCompletionChange={onGuidedCompletionChange}
        block={{
          id: 'true-false-completion',
          type: 'true_false',
          order: 0,
          items: [
            { id: 'first', statement: 'First statement.', correctAnswer: true },
            { id: 'second', statement: 'Second statement.', correctAnswer: false },
          ],
        }}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Falso' }))
    fireEvent.click(target.querySelector('button') as HTMLButtonElement)
    expect(onGuidedCompletionChange).toHaveBeenLastCalledWith(false)
    expect(target.querySelector('button')).toHaveTextContent('Siguiente pregunta')

    fireEvent.click(target.querySelector('button') as HTMLButtonElement)
    fireEvent.click(screen.getByRole('button', { name: 'Verdadero' }))
    fireEvent.click(target.querySelector('button') as HTMLButtonElement)
    expect(onGuidedCompletionChange).toHaveBeenLastCalledWith(true)
  })

  const guidedPairs = [
    { id: 'first', left: 'First', right: 'Alpha' },
    { id: 'second', left: 'Second', right: 'Beta' },
  ]

  it('teaches category recognition with four stable choices and advances after correction', () => {
    vi.useFakeTimers()
    const pilotPairs = [
      { id: 'name', left: 'Name', right: 'Peter' },
      { id: 'family', left: 'Family Name', right: 'Smith' },
      { id: 'occupation', left: 'Occupation', right: 'Teacher' },
      { id: 'spelling', left: 'Spelling', right: 'P-E-T-E-R' },
      { id: 'age', left: 'Age', right: '20 years old' },
      { id: 'origin', left: 'Origin', right: 'The US' },
      { id: 'address', left: 'Address', right: 'Lincoln Avenue, 23rd' },
      { id: 'phone', left: 'Phone/Mail', right: '01 154 8593' },
      { id: 'marital', left: 'Marital Status', right: 'I am married but Jake is single' },
    ]
    const { rerender, container } = render(
      <BlockPreview
        guidedAppearance
        block={{ id: 'dev-unit1-interleaved-vocabulary', type: 'match', order: 0, pairs: pilotPairs }}
      />
    )

    const firstOrder = Array.from(container.querySelectorAll('[data-guided-match-choice]')).map(
      (button) => button.textContent
    )
    expect(container.querySelectorAll('[data-guided-match-choice]')).toHaveLength(4)
    expect(screen.getByRole('heading', { name: 'My first name is Ana.' })).toBeInTheDocument()
    expect(screen.getByText('¿Qué tipo de dato es?')).toBeInTheDocument()
    expect(firstOrder).toContain('Name')
    expect(firstOrder).not.toEqual(expect.arrayContaining(['Peter', 'Lucas', 'Carl', 'Jake']))

    rerender(
      <BlockPreview
        guidedAppearance
        block={{ id: 'dev-unit1-interleaved-vocabulary', type: 'match', order: 0, pairs: pilotPairs }}
      />
    )
    expect(
      Array.from(container.querySelectorAll('[data-guided-match-choice]')).map(
        (button) => button.textContent
      )
    ).toEqual(firstOrder)
    fireEvent.click(screen.getByRole('button', { name: 'Name', exact: true }))
    expect(screen.getByRole('status')).toHaveTextContent('¡Correcto!')
    act(() => vi.advanceTimersByTime(GUIDED_MATCH_CORRECT_FEEDBACK_MS))
    expect(screen.getByRole('heading', { name: 'My surname is Brown.' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Family Name', exact: true })).toBeInTheDocument()
  })

  it('confirms immediately, guards duplicate clicks, announces wrong feedback, and advances', () => {
    vi.useFakeTimers()
    render(
      <BlockPreview
        guidedAppearance
        block={{ id: 'match-feedback', type: 'match', order: 0, pairs: guidedPairs }}
      />
    )

    const wrongChoice = screen.getByRole('button', { name: 'Beta' })
    fireEvent.click(wrongChoice)
    fireEvent.click(wrongChoice)

    expect(screen.getByRole('status')).toHaveTextContent('Respuesta correcta: Alpha')
    expect(wrongChoice).toBeDisabled()
    expect(screen.getByRole('heading', { name: 'First' })).toBeInTheDocument()

    act(() => vi.advanceTimersByTime(GUIDED_MATCH_WRONG_FEEDBACK_MS - 1))
    expect(screen.getByRole('heading', { name: 'First' })).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(1))
    expect(screen.getByRole('heading', { name: 'Second' })).toBeInTheDocument()
  })

  it('supports keyboard activation and reports a complete summary, including wrong answers', () => {
    vi.useFakeTimers()
    const onGuidedCompletionChange = vi.fn()
    render(
      <BlockPreview
        guidedAppearance
        onGuidedCompletionChange={onGuidedCompletionChange}
        block={{ id: 'match-summary', type: 'match', order: 0, pairs: guidedPairs }}
      />
    )

    fireEvent.keyDown(screen.getByRole('button', { name: 'Beta' }), { key: 'Enter' })
    act(() => vi.advanceTimersByTime(GUIDED_MATCH_WRONG_FEEDBACK_MS))
    fireEvent.keyDown(screen.getByRole('button', { name: 'Beta' }), { key: ' ' })
    act(() => vi.advanceTimersByTime(GUIDED_MATCH_CORRECT_FEEDBACK_MS))

    expect(onGuidedCompletionChange).toHaveBeenLastCalledWith(true)
    const summary = screen.getByRole('region', { name: 'Resultado de asociaciones' })
    expect(summary).toHaveTextContent('First')
    expect(summary).toHaveTextContent('Tu respuesta: Beta')
    expect(summary).toHaveTextContent('Respuesta correcta: Alpha')
    expect(summary).toHaveTextContent('Second')
    expect(summary).toHaveTextContent('Second → Beta')
    expect(summary).toHaveTextContent('Correcto')
  })

  it('reports completion after all correct answers and keeps the guided footer action absent', () => {
    vi.useFakeTimers()
    const target = document.createElement('div')
    const onGuidedActionPresence = vi.fn()
    const onGuidedCompletionChange = vi.fn()
    document.body.appendChild(target)

    render(
      <BlockPreview
        guidedAppearance
        guidedActionTarget={target}
        onGuidedActionPresence={onGuidedActionPresence}
        onGuidedCompletionChange={onGuidedCompletionChange}
        block={{ id: 'match-complete', type: 'match', order: 0, pairs: guidedPairs }}
      />
    )

    expect(onGuidedActionPresence).toHaveBeenLastCalledWith(false)
    expect(target).toBeEmptyDOMElement()
    fireEvent.click(screen.getByRole('button', { name: 'Alpha' }))
    act(() => vi.advanceTimersByTime(GUIDED_MATCH_CORRECT_FEEDBACK_MS))
    fireEvent.click(screen.getByRole('button', { name: 'Beta' }))
    act(() => vi.advanceTimersByTime(GUIDED_MATCH_CORRECT_FEEDBACK_MS))

    expect(onGuidedCompletionChange).toHaveBeenLastCalledWith(true)
    expect(screen.getByRole('region', { name: 'Resultado de asociaciones' })).toHaveTextContent(
      'Todas las respuestas son correctas'
    )
    expect(target).toBeEmptyDOMElement()
  })

  it('cleans up the feedback timer when the guided match unmounts', () => {
    vi.useFakeTimers()
    const { unmount } = render(
      <BlockPreview
        guidedAppearance
        block={{ id: 'match-cleanup', type: 'match', order: 0, pairs: guidedPairs }}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Alpha' }))
    expect(vi.getTimerCount()).toBe(1)
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('reports fill-in completion after checking all authored questions, including a wrong answer', () => {
    const target = document.createElement('div')
    const onGuidedCompletionChange = vi.fn()
    document.body.appendChild(target)

    render(
      <BlockPreview
        guidedAppearance
        guidedActionTarget={target}
        onGuidedCompletionChange={onGuidedCompletionChange}
        block={{
          id: 'fill-completion',
          type: 'fill_blanks',
          order: 0,
          items: [
            { id: 'first', content: 'I [am] ready.' },
            { id: 'second', content: 'You [are] ready.' },
          ],
        }}
      />
    )

    const firstInput = screen.getByRole('textbox', { name: 'Respuesta 2' })
    expect(target.querySelector('button')).toBeDisabled()
    fireEvent.change(firstInput, { target: { value: 'is' } })
    fireEvent.click(target.querySelector('button') as HTMLButtonElement)
    expect(onGuidedCompletionChange).toHaveBeenLastCalledWith(false)
    fireEvent.click(target.querySelector('button') as HTMLButtonElement)

    const secondInput = screen.getByRole('textbox', { name: 'Respuesta 2' })
    fireEvent.change(secondInput, { target: { value: 'are' } })
    fireEvent.click(target.querySelector('button') as HTMLButtonElement)
    expect(onGuidedCompletionChange).toHaveBeenLastCalledWith(true)
  })

  it('reports multiple-choice completion after every question is checked', () => {
    const target = document.createElement('div')
    const onGuidedCompletionChange = vi.fn()
    document.body.appendChild(target)

    render(
      <BlockPreview
        guidedAppearance
        guidedActionTarget={target}
        onGuidedCompletionChange={onGuidedCompletionChange}
        block={{
          id: 'choice-completion',
          type: 'multiple_choice',
          order: 0,
          items: [
            {
              id: 'first',
              question: 'First?',
              options: [
                { id: 'yes', text: 'Yes' },
                { id: 'no', text: 'No' },
              ],
              correctOptionId: 'yes',
            },
            {
              id: 'second',
              question: 'Second?',
              options: [
                { id: 'yes', text: 'Yes' },
                { id: 'no', text: 'No' },
              ],
              correctOptionId: 'no',
            },
          ],
        }}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'No' }))
    fireEvent.click(target.querySelector('button') as HTMLButtonElement)
    expect(onGuidedCompletionChange).toHaveBeenLastCalledWith(false)
    expect(target.querySelector('button')).toHaveTextContent('Siguiente pregunta')
    fireEvent.click(target.querySelector('button') as HTMLButtonElement)
    fireEvent.click(screen.getByRole('button', { name: 'No' }))
    fireEvent.click(target.querySelector('button') as HTMLButtonElement)
    expect(onGuidedCompletionChange).toHaveBeenLastCalledWith(true)
  })

  it('uses Corregir for guided essay grading and invalidates completion when the draft changes', () => {
    const target = document.createElement('div')
    const onGuidedCompletionChange = vi.fn()
    document.body.appendChild(target)

    render(
      <BlockPreview
        guidedAppearance
        guidedActionTarget={target}
        onGuidedCompletionChange={onGuidedCompletionChange}
        block={{
          id: 'essay-completion',
          type: 'essay',
          order: 0,
          prompt: 'Write a paragraph.',
          aiGrading: true,
        }}
      />
    )

    expect(target.querySelector('button')).toHaveTextContent('Corregir')
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'A complete draft.' } })
    fireEvent.click(target.querySelector('button') as HTMLButtonElement)
    expect(onGuidedCompletionChange).toHaveBeenLastCalledWith(true)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'An edited draft.' } })
    expect(onGuidedCompletionChange).toHaveBeenLastCalledWith(false)
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
    expect(fillInput).not.toBeDisabled()

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
