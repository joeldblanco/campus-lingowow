import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  CORRECT_FEEDBACK_MS,
  GuidedChoiceActivity,
  WRONG_FEEDBACK_MS,
  type GuidedChoiceQuestion,
} from './guided-choice-activity'
import motion from './guided-choice-activity.module.css'

const questions: GuidedChoiceQuestion[] = [
  {
    id: 'pronoun-1',
    prompt: 'She is Ana. ___ name is Ana.',
    choices: [
      { id: 'his', text: 'His' },
      { id: 'her', text: 'Her' },
      { id: 'their', text: 'Their' },
      { id: 'our', text: 'Our' },
    ],
    correctChoiceId: 'her',
    explanation: 'Usa «her» para hablar de una mujer.',
  },
  {
    id: 'pronoun-2',
    prompt: 'They are students. ___ teacher is kind.',
    choices: [
      { id: 'my', text: 'My' },
      { id: 'their-2', text: 'Their' },
      { id: 'his-2', text: 'His' },
      { id: 'our-2', text: 'Our' },
    ],
    correctChoiceId: 'their-2',
  },
]

afterEach(() => {
  vi.useRealTimers()
})

describe('GuidedChoiceActivity', () => {
  it('checks a correct selection immediately and advances after the short feedback delay', () => {
    vi.useFakeTimers()
    render(<GuidedChoiceActivity questions={questions} />)

    fireEvent.click(screen.getByRole('button', { name: 'Her' }))

    expect(screen.getByRole('status')).toHaveTextContent('¡Correcto!')
    const correctChoice = screen.getByRole('button', { name: 'Her' })
    expect(correctChoice).toBeDisabled()
    expect(correctChoice).toHaveAttribute('data-guided-choice-celebrating', 'true')
    expect(correctChoice).toHaveClass(motion.correctChoice)
    expect(screen.getByText('She is Ana. ___ name is Ana.')).toBeInTheDocument()

    act(() => vi.advanceTimersByTime(CORRECT_FEEDBACK_MS - 1))
    expect(screen.getByText('She is Ana. ___ name is Ana.')).toBeInTheDocument()

    act(() => vi.advanceTimersByTime(1))
    expect(screen.getByText('They are students. ___ teacher is kind.')).toBeInTheDocument()
    expect(document.activeElement).toBe(screen.getByText(questions[1].prompt))
  })

  it('keeps wrong feedback visible longer and marks both the selected and correct rows inline', () => {
    vi.useFakeTimers()
    const { container } = render(<GuidedChoiceActivity questions={questions} />)

    fireEvent.click(screen.getByRole('button', { name: 'His' }))

    expect(screen.getByRole('status')).toHaveTextContent('Respuesta incorrecta.')
    expect(container.querySelector('[data-guided-choice="his"]')).toHaveAttribute(
      'data-guided-choice-state',
      'wrong'
    )
    expect(container.querySelector('[data-guided-choice="her"]')).toHaveAttribute(
      'data-guided-choice-state',
      'correct'
    )
    expect(container.querySelector('[data-guided-choice="her"]')).not.toHaveAttribute(
      'data-guided-choice-celebrating'
    )
    expect(
      screen.queryByRole('button', { name: /comprobar|siguiente|anterior|reintentar/i })
    ).toBeNull()

    act(() => vi.advanceTimersByTime(WRONG_FEEDBACK_MS - 1))
    expect(screen.getByText('She is Ana. ___ name is Ana.')).toBeInTheDocument()

    act(() => vi.advanceTimersByTime(1))
    expect(screen.getByText('They are students. ___ teacher is kind.')).toBeInTheDocument()
  })

  it('locks the first click synchronously so a duplicate click cannot replace the answer or timer', () => {
    vi.useFakeTimers()
    const { container } = render(<GuidedChoiceActivity questions={questions} />)
    const wrongChoice = screen.getByRole('button', { name: 'His' })
    const correctChoice = screen.getByRole('button', { name: 'Her' })

    fireEvent.click(wrongChoice)
    fireEvent.click(correctChoice)

    expect(wrongChoice).toHaveAttribute('aria-pressed', 'true')
    expect(correctChoice).toHaveAttribute('aria-pressed', 'false')
    expect(container.querySelector('[data-guided-choice="his"]')).toHaveAttribute(
      'data-guided-choice-state',
      'wrong'
    )
    expect(vi.getTimerCount()).toBe(1)
  })

  it('waits until the final feedback finishes, then reports completion with a retained summary', () => {
    vi.useFakeTimers()
    const onCompletionChange = vi.fn()
    render(<GuidedChoiceActivity questions={questions} onCompletionChange={onCompletionChange} />)

    fireEvent.click(screen.getByRole('button', { name: 'Her' }))
    act(() => vi.advanceTimersByTime(CORRECT_FEEDBACK_MS))
    fireEvent.click(screen.getByRole('button', { name: 'My' }))

    expect(onCompletionChange).toHaveBeenLastCalledWith(false)
    expect(screen.getByText('They are students. ___ teacher is kind.')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Resumen' })).not.toBeInTheDocument()

    act(() => vi.advanceTimersByTime(WRONG_FEEDBACK_MS - 1))
    expect(onCompletionChange).toHaveBeenLastCalledWith(false)

    act(() => vi.advanceTimersByTime(1))
    expect(onCompletionChange).toHaveBeenLastCalledWith(true)
    expect(screen.getByRole('heading', { name: 'Resumen' })).toBeInTheDocument()
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Resumen' }))
    expect(screen.getByText('Her')).toBeInTheDocument()
    expect(screen.getByText('My')).toBeInTheDocument()
    expect(screen.getAllByText('Their').length).toBeGreaterThanOrEqual(1)
  })

  it('pauses feedback while its guided step is hidden and resumes on return', async () => {
    vi.useFakeTimers()
    const { container } = render(
      <div data-guided-step>
        <GuidedChoiceActivity questions={questions} />
      </div>
    )
    const step = container.querySelector('[data-guided-step]') as HTMLElement
    fireEvent.click(screen.getByRole('button', { name: 'His' }))
    await act(async () => {
      step.hidden = true
      await Promise.resolve()
    })
    act(() => vi.advanceTimersByTime(WRONG_FEEDBACK_MS + 500))
    expect(screen.getByText('She is Ana. ___ name is Ana.')).toBeInTheDocument()

    await act(async () => {
      step.hidden = false
      await Promise.resolve()
    })
    act(() => vi.advanceTimersByTime(WRONG_FEEDBACK_MS - 1))
    expect(screen.getByText('She is Ana. ___ name is Ana.')).toBeInTheDocument()

    act(() => vi.advanceTimersByTime(1))
    expect(screen.getByText('They are students. ___ teacher is kind.')).toBeInTheDocument()
  })

  it('cleans a pending timer when unmounted', () => {
    vi.useFakeTimers()
    const onCompletionChange = vi.fn()
    const { unmount } = render(
      <GuidedChoiceActivity questions={questions} onCompletionChange={onCompletionChange} />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Her' }))
    expect(vi.getTimerCount()).toBe(1)

    unmount()
    expect(vi.getTimerCount()).toBe(0)
    act(() => vi.runOnlyPendingTimers())
    expect(onCompletionChange).not.toHaveBeenLastCalledWith(true)
  })

  it('reports the selected answer and the next question to classroom callbacks', () => {
    vi.useFakeTimers()
    const onAnswer = vi.fn()
    const onNavigation = vi.fn()

    render(
      <GuidedChoiceActivity
        questions={questions}
        onAnswer={onAnswer}
        onNavigation={onNavigation}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'His' }))
    expect(onAnswer).toHaveBeenCalledWith('pronoun-1', 'his', false)
    expect(onNavigation).not.toHaveBeenCalled()

    act(() => vi.advanceTimersByTime(WRONG_FEEDBACK_MS))
    expect(onNavigation).toHaveBeenLastCalledWith(1, 2)
    expect(screen.getByText('They are students. ___ teacher is kind.')).toBeInTheDocument()
  })

  it('keeps feedback and retained answers when an unrelated remote update repeats the same index', () => {
    vi.useFakeTimers()
    const { rerender } = render(
      <GuidedChoiceActivity questions={questions} remoteIndex={0} />
    )

    fireEvent.click(screen.getByRole('button', { name: 'His' }))
    rerender(<GuidedChoiceActivity questions={questions} remoteIndex={0} />)
    expect(screen.getByRole('status')).toHaveTextContent('Respuesta incorrecta.')

    act(() => vi.advanceTimersByTime(WRONG_FEEDBACK_MS - 1))
    expect(screen.getByText('She is Ana. ___ name is Ana.')).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(1))
    expect(screen.getByText('They are students. ___ teacher is kind.')).toBeInTheDocument()
  })

  it('follows a changed remote index without discarding the completed question answer', () => {
    vi.useFakeTimers()
    const { rerender } = render(
      <GuidedChoiceActivity questions={questions} remoteIndex={0} />
    )

    fireEvent.click(screen.getByRole('button', { name: 'His' }))
    rerender(<GuidedChoiceActivity questions={questions} remoteIndex={1} />)
    expect(screen.getByText('They are students. ___ teacher is kind.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'My' }))
    act(() => vi.advanceTimersByTime(WRONG_FEEDBACK_MS))
    expect(screen.getByRole('heading', { name: 'Resumen' })).toBeInTheDocument()
    expect(screen.getByText('His')).toBeInTheDocument()
    expect(screen.getByText('My')).toBeInTheDocument()
  })
})
