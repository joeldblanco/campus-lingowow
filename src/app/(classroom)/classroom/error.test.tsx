import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn() }))

import * as Sentry from '@sentry/nextjs'
import ClassroomError from './error'

function makeError() {
  return new Error('boom') as Error & { digest?: string }
}

describe('Classroom error boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('reports the error to Sentry and shows a friendly message', () => {
    const error = makeError()
    render(<ClassroomError error={error} reset={vi.fn()} />)

    expect(Sentry.captureException).toHaveBeenCalledWith(error)
    expect(screen.getByText('No pudimos cargar el aula')).toBeInTheDocument()
  })

  it('calls reset() when the user clicks "Reintentar"', () => {
    const reset = vi.fn()
    render(<ClassroomError error={makeError()} reset={reset} />)

    fireEvent.click(screen.getByText('Reintentar'))
    expect(reset).toHaveBeenCalledTimes(1)
  })
})
