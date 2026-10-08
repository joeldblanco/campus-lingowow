import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BlockPreview } from './block-preview'
import {
  GuidedShortAnswerActivity,
  GUIDED_SHORT_ANSWER_FEEDBACK_MS,
} from './guided-short-answer'
import { ClassroomSyncContext } from '@/components/classroom/use-classroom-sync'

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

afterEach(() => {
  vi.useRealTimers()
  cleanup()
})

const answerItems = [
  { id: 'first', question: '¿Cómo te llamas?', correctAnswer: 'Ana', acceptedAnswers: ['Ana María'] },
  { id: 'second', question: '¿De dónde eres?', correctAnswer: 'Perú', acceptedAnswers: ['Peru'] },
]

describe('GuidedShortAnswerActivity', () => {
  it('accepts reviewed answer variants and completes after the 900ms feedback pause', () => {
    vi.useFakeTimers()
    const onCompletionChange = vi.fn()
    render(
      <GuidedShortAnswerActivity
        blockId="short-answer-variants"
        items={answerItems.slice(0, 1)}
        onCompletionChange={onCompletionChange}
      />
    )

    const input = screen.getByRole('textbox', { name: '¿Cómo te llamas?' })
    fireEvent.change(input, { target: { value: 'ana maría' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(screen.getByRole('status')).toHaveTextContent('¡Correcto!')
    expect(onCompletionChange).toHaveBeenLastCalledWith(false)
    act(() => vi.advanceTimersByTime(GUIDED_SHORT_ANSWER_FEEDBACK_MS - 1))
    expect(onCompletionChange).not.toHaveBeenCalledWith(true)
    act(() => vi.advanceTimersByTime(1))
    expect(onCompletionChange).toHaveBeenLastCalledWith(true)
    expect(screen.getByRole('region', { name: 'Resultado de respuestas cortas' })).toHaveTextContent(
      'Correcto'
    )
  })

  it('respects caseSensitive answers and keeps the guided activity to one check control', () => {
    render(
      <GuidedShortAnswerActivity
        blockId="short-answer-case"
        items={[{ id: 'case', question: 'Type the code', correctAnswer: 'AbC' }]}
        caseSensitive
      />
    )

    const input = screen.getByRole('textbox', { name: 'Type the code' })
    fireEvent.change(input, { target: { value: 'abc' } })
    fireEvent.click(screen.getByRole('button', { name: 'Comprobar' }))

    expect(screen.getByRole('status')).toHaveTextContent('Respuesta correcta: AbC')
    expect(screen.queryAllByRole('button', { name: /Anterior|Siguiente|Reintentar/ })).toHaveLength(0)
    expect(screen.queryAllByRole('button', { name: 'Comprobar' })).toHaveLength(0)
  })

  it('advances one question at a time, retains responses, and completes after the final answer', () => {
    vi.useFakeTimers()
    const onCompletionChange = vi.fn()
    render(
      <GuidedShortAnswerActivity
        blockId="short-answer-navigation"
        items={answerItems}
        onCompletionChange={onCompletionChange}
      />
    )

    fireEvent.change(screen.getByRole('textbox', { name: '¿Cómo te llamas?' }), {
      target: { value: 'Incorrecta' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Comprobar' }))
    act(() => vi.advanceTimersByTime(GUIDED_SHORT_ANSWER_FEEDBACK_MS))

    expect(screen.getByText('Pregunta 2 de 2')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: '¿De dónde eres?' })).toHaveFocus()
    fireEvent.change(screen.getByRole('textbox', { name: '¿De dónde eres?' }), {
      target: { value: 'Peru' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Comprobar' }))
    act(() => vi.advanceTimersByTime(GUIDED_SHORT_ANSWER_FEEDBACK_MS))

    const summary = screen.getByRole('region', { name: 'Resultado de respuestas cortas' })
    expect(summary).toHaveTextContent('Tu respuesta: Incorrecta')
    expect(summary).toHaveTextContent('Respuesta correcta: Ana / Ana María')
    expect(summary).toHaveTextContent('Tu respuesta: Peru')
    expect(onCompletionChange).toHaveBeenLastCalledWith(true)
  })

  it('resets retained answers when the authored item signature changes', () => {
    const { rerender } = render(
      <GuidedShortAnswerActivity
        blockId="short-answer-reset"
        items={[{ id: 'first', question: 'First question', correctAnswer: 'one' }]}
      />
    )
    const input = screen.getByRole('textbox', { name: 'First question' })
    fireEvent.change(input, { target: { value: 'draft' } })

    rerender(
      <GuidedShortAnswerActivity
        blockId="short-answer-reset"
        items={[{ id: 'second', question: 'Second question', correctAnswer: 'two' }]}
      />
    )

    expect(screen.getByRole('textbox', { name: 'Second question' })).toHaveValue('')
  })

  it('keeps the classic teacher classroom renderer disabled', () => {
    const classroom = {
      isInClassroom: true,
      isTeacher: true,
      remoteBlockNavigation: new Map(),
      sendBlockResponse: vi.fn(),
      syncBlockNavigation: vi.fn(),
    }
    render(
      <ClassroomSyncContext.Provider value={classroom}>
        <BlockPreview
          guidedAppearance
          block={{
            id: 'short-answer-teacher',
            type: 'short_answer',
            order: 0,
            items: [{ id: 'first', question: 'First question', correctAnswer: 'one' }],
          }}
        />
      </ClassroomSyncContext.Provider>
    )

    expect(screen.getByText('Respuesta Corta')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Esperando respuesta del estudiante...')).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Comprobar' })).not.toBeInTheDocument()
  })
})
