import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  GuidedFillActivity,
  GUIDED_FILL_CORRECT_FEEDBACK_MS,
  GUIDED_FILL_WRONG_FEEDBACK_MS,
} from './guided-fill-activity'

afterEach(() => {
  vi.useRealTimers()
  cleanup()
})

describe('GuidedFillActivity', () => {
  it('keeps Comprobar local, guards incomplete Enter, and uses accessible bracket labels', () => {
    const onCompletionChange = vi.fn()
    render(
      <GuidedFillActivity
        items={[{ id: 'first', content: 'I [am] ready.' }]}
        onCompletionChange={onCompletionChange}
      />
    )

    const input = screen.getByRole('textbox', { name: 'Respuesta 2' })
    expect(screen.getByText('Pregunta 1 de 1')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Comprobar' })).toBeDisabled()
    expect(
      screen.queryByRole('button', { name: /Pregunta anterior|Siguiente|Reintentar|Retry/ })
    ).not.toBeInTheDocument()

    fireEvent.keyDown(input, { key: 'Enter' })
    expect(screen.queryByRole('status')).not.toBeInTheDocument()

    fireEvent.change(input, { target: { value: 'am' } })
    expect(screen.getByRole('button', { name: 'Comprobar' })).not.toBeDisabled()
    expect(onCompletionChange).toHaveBeenLastCalledWith(false)
  })

  it('checks on Enter only when every blank is filled and locks the inputs', () => {
    render(<GuidedFillActivity items={[{ id: 'first', content: 'I [am] and you [are] ready.' }]} />)

    const firstInput = screen.getByRole('textbox', { name: 'Respuesta 2' })
    const secondInput = screen.getByRole('textbox', { name: 'Respuesta 4' })
    fireEvent.change(firstInput, { target: { value: 'am' } })
    fireEvent.keyDown(firstInput, { key: 'Enter' })
    expect(screen.queryByRole('status')).not.toBeInTheDocument()

    fireEvent.change(secondInput, { target: { value: 'are' } })
    fireEvent.keyDown(secondInput, { key: 'Enter' })
    expect(screen.getByRole('status')).toHaveTextContent('¡Correcto!')
    expect(firstInput).toBeDisabled()
    expect(secondInput).toBeDisabled()
  })

  it('shows wrong expected values and advances after the longer feedback pause', () => {
    vi.useFakeTimers()
    render(
      <GuidedFillActivity
        items={[
          { id: 'first', content: 'I [am] ready.' },
          { id: 'second', content: 'You [are] ready.' },
        ]}
      />
    )

    const firstInput = screen.getByRole('textbox', { name: 'Respuesta 2' })
    fireEvent.change(firstInput, { target: { value: 'is' } })
    fireEvent.click(screen.getByRole('button', { name: 'Comprobar' }))
    expect(screen.getByRole('status')).toHaveTextContent('Respuesta correcta: am')
    expect(firstInput).toBeDisabled()

    act(() => vi.advanceTimersByTime(GUIDED_FILL_WRONG_FEEDBACK_MS - 1))
    expect(screen.getByText('Pregunta 1 de 2')).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(1))
    expect(screen.getByText('Pregunta 2 de 2')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Respuesta 2' })).toHaveFocus()

    fireEvent.change(screen.getByRole('textbox', { name: 'Respuesta 2' }), {
      target: { value: 'are' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Comprobar' }))
    act(() => vi.advanceTimersByTime(GUIDED_FILL_CORRECT_FEEDBACK_MS))
    expect(screen.getByRole('region', { name: 'Resultado de completar frases' })).toHaveTextContent(
      'I [am] ready.'
    )
  })

  it('waits for the final pause before reporting completion and keeps a concise authored summary', () => {
    vi.useFakeTimers()
    const onCompletionChange = vi.fn()
    render(
      <GuidedFillActivity
        items={[{ id: 'first', content: 'I [am] ready.' }]}
        onCompletionChange={onCompletionChange}
      />
    )

    const input = screen.getByRole('textbox', { name: 'Respuesta 2' })
    fireEvent.change(input, { target: { value: 'am' } })
    fireEvent.click(screen.getByRole('button', { name: 'Comprobar' }))
    act(() => vi.advanceTimersByTime(GUIDED_FILL_CORRECT_FEEDBACK_MS - 1))
    expect(onCompletionChange).not.toHaveBeenCalledWith(true)
    expect(
      screen.queryByRole('region', { name: 'Resultado de completar frases' })
    ).not.toBeInTheDocument()

    act(() => vi.advanceTimersByTime(1))
    expect(onCompletionChange).toHaveBeenLastCalledWith(true)
    const summary = screen.getByRole('region', { name: 'Resultado de completar frases' })
    expect(summary).toHaveTextContent('I [am] ready.')
    expect(summary).toHaveTextContent('Tu respuesta: am')
    expect(summary).toHaveTextContent('Correcto')
    expect(screen.queryByRole('button', { name: 'Comprobar' })).not.toBeInTheDocument()
  })

  it('pauses and resumes the feedback timer with a hidden guided step and cleans it up', async () => {
    vi.useFakeTimers()
    const onCompletionChange = vi.fn()
    render(
      <div data-testid="step-wrapper" data-guided-step="first">
        <GuidedFillActivity
          items={[{ id: 'first', content: 'I [am] ready.' }]}
          onCompletionChange={onCompletionChange}
        />
      </div>
    )

    const input = screen.getByRole('textbox', { name: 'Respuesta 2' })
    fireEvent.change(input, { target: { value: 'am' } })
    fireEvent.click(screen.getByRole('button', { name: 'Comprobar' }))
    act(() => vi.advanceTimersByTime(400))

    const wrapper = screen.getByTestId('step-wrapper')
    await act(async () => {
      wrapper.setAttribute('hidden', '')
      await Promise.resolve()
    })
    act(() => vi.advanceTimersByTime(1000))
    expect(onCompletionChange).not.toHaveBeenCalledWith(true)

    await act(async () => {
      wrapper.removeAttribute('hidden')
      await Promise.resolve()
    })
    act(() => vi.advanceTimersByTime(499))
    expect(onCompletionChange).not.toHaveBeenCalledWith(true)
    act(() => vi.advanceTimersByTime(1))
    expect(onCompletionChange).toHaveBeenLastCalledWith(true)
  })

  it('cleans up a pending feedback timer when unmounted', () => {
    vi.useFakeTimers()
    const { unmount } = render(
      <GuidedFillActivity items={[{ id: 'first', content: 'I [am] ready.' }]} />
    )

    const input = screen.getByRole('textbox', { name: 'Respuesta 2' })
    fireEvent.change(input, { target: { value: 'am' } })
    fireEvent.click(screen.getByRole('button', { name: 'Comprobar' }))
    expect(vi.getTimerCount()).toBe(1)
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})
