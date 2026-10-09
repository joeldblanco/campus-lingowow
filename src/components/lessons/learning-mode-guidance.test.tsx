import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { LearningModeGuidance } from './learning-mode-guidance'

afterEach(cleanup)
describe('LearningModeGuidance', () => {
  it('offers an independent task and lets the learner switch to live teacher practice', () => {
    render(<LearningModeGuidance modes={{ individual: 'Graba ambos papeles y escucha tu respuesta.', teacher: 'Intercambia los perfiles con tu profesora.' }} />)
    expect(screen.getByRole('radio', { name: 'Por mi cuenta' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByText('Graba ambos papeles y escucha tu respuesta.')).toBeVisible()
    fireEvent.keyDown(screen.getByRole('radio', { name: 'Por mi cuenta' }), { key: 'ArrowRight' })
    expect(screen.getByRole('radio', { name: 'Con mi profesora' })).toHaveFocus()
    expect(screen.getByText('Intercambia los perfiles con tu profesora.')).toBeVisible()
    fireEvent.keyDown(screen.getByRole('radio', { name: 'Con mi profesora' }), { key: 'Home' })
    expect(screen.getByText('Graba ambos papeles y escucha tu respuesta.')).toBeVisible()
    fireEvent.click(screen.getByRole('radio', { name: 'Con mi profesora' }))
    expect(screen.getByText('Intercambia los perfiles con tu profesora.')).toBeVisible()
    expect(screen.queryByText('Graba ambos papeles y escucha tu respuesta.')).not.toBeInTheDocument()
  })
  it('ignores incomplete source metadata instead of exposing a broken choice', () => {
    const { container } = render(<LearningModeGuidance modes={{ individual: 'Practice.' }} />)
    expect(container).toBeEmptyDOMElement()
  })
  it('starts with teacher guidance for a live classroom', () => {
    render(<LearningModeGuidance classroom modes={{ individual: 'Individual.', teacher: 'En pareja.' }} />)
    expect(screen.getByRole('radio', { name: 'Con mi profesora' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByText('En pareja.')).toBeVisible()
  })
})
