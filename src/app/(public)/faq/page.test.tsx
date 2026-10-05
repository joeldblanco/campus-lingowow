import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import FAQPage from './page'

vi.mock('@/components/public-components/header', () => ({ default: () => null }))
vi.mock('@/components/public-components/footer', () => ({ default: () => null }))

describe('FAQ pricing and class duration', () => {
  it('directs students to current shop prices and explains the available plans', () => {
    render(<FAQPage />)
    fireEvent.click(screen.getByRole('button', { name: '¿Cuánto cuestan los cursos?' }))

    const answer = screen.getByRole('region')
    expect(answer).toHaveTextContent('Essentials y Exclusive')
    expect(answer).toHaveTextContent('Go: 8 clases al mes (2 por semana)')
    expect(answer).toHaveTextContent('Lingo: 12 clases al mes (3 por semana)')
    expect(answer).toHaveTextContent('Wow: 16 clases al mes (4 por semana)')
    expect(screen.getByRole('link', { name: 'Tienda' })).toHaveAttribute('href', '/shop')
    expect(answer).not.toHaveTextContent(/Básico|Intensivo|Premium|\$(89|149|199)/)
  })

  it('guarantees 40 minutes and makes extensions discretionary', () => {
    render(<FAQPage />)
    fireEvent.click(screen.getByRole('button', { name: '¿Cuánto dura cada clase?' }))

    const answer = screen.getByRole('region')
    expect(answer).toHaveTextContent('duración garantizada de 40 minutos')
    expect(answer).toHaveTextContent('hasta 60 minutos a criterio del profesor')
    expect(answer).toHaveTextContent('opcional')
    expect(answer).toHaveTextContent('no constituye un derecho del estudiante ni una obligación del profesor')
  })
})
