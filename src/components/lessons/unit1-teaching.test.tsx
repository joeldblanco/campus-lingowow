import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Block } from '@/types/course-builder'
import { isUnit1TeachingBlock, Unit1Teaching } from './unit1-teaching'

vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    <span role="img" aria-label={alt} data-testid="unit1-image" data-src={src} />
  ),
}))

function teachingBlock(role: string): Block {
  return {
    id: `unit1-${role}`,
    type: 'text',
    order: 0,
    content: '',
    data: { unit1Role: role },
  }
}

function renderRole(role: string) {
  return render(<Unit1Teaching block={teachingBlock(role)} />)
}

describe('Unit 1 teaching blocks', () => {
  it('recognizes only the six supported role values', () => {
    expect(isUnit1TeachingBlock(teachingBlock('introductions'))).toBe(true)
    expect(isUnit1TeachingBlock(teachingBlock('contact'))).toBe(true)
    expect(isUnit1TeachingBlock(teachingBlock('questions'))).toBe(true)
    expect(isUnit1TeachingBlock(teachingBlock('transform'))).toBe(true)
    expect(isUnit1TeachingBlock(teachingBlock('possessives'))).toBe(true)
    expect(isUnit1TeachingBlock(teachingBlock('intro-audio-notes'))).toBe(true)
    expect(isUnit1TeachingBlock(teachingBlock('audio'))).toBe(false)
    expect(isUnit1TeachingBlock({ id: 'plain', type: 'text', order: 0, content: '' })).toBe(false)
  })

  it('renders the four introduction examples without taking over the viewer heading', () => {
    const { container } = renderRole('introductions')
    const examples = container.querySelectorAll('[data-unit1-example-row]')

    expect(container.querySelector('[data-unit1-role="introductions"]')).toBeInTheDocument()
    expect(examples).toHaveLength(4)
    expect(examples[0]).toHaveTextContent('My name is Peter.')
    expect(examples[1]).toHaveTextContent('I am 20 years old.')
    expect(examples[2]).toHaveTextContent('I am from the US.')
    expect(examples[3]).toHaveTextContent('She is a teacher.')
    expect(screen.getByText('→ Nombre')).toBeVisible()
    expect(screen.getByText('→ Edad')).toBeVisible()
    expect(screen.getByText('→ Origen')).toBeVisible()
    expect(screen.getByText('→ Ocupación')).toBeVisible()
    expect(container.querySelector('h1, h2, h3')).toBeNull()
  })

  it('keeps contact examples clearly fictional and does not render an audio control', () => {
    const { container } = renderRole('contact')

    expect(screen.getByText('Ejemplo ficticio para practicar.')).toBeVisible()
    expect(screen.getByText('I live in', { exact: false })).toBeVisible()
    expect(screen.getByText('01 154 8593.')).toBeVisible()
    expect(screen.getByText('peter@example.com.')).toBeVisible()
    expect(screen.getByText('Para decir dónde vives, usamos', { exact: false })).toBeVisible()
    expect(container.querySelector('audio')).toBeNull()
  })

  it('shows the question and transformation grammar with tangent arrow markers', () => {
    const { container } = renderRole('questions')
    const questionText = container.querySelector('[data-unit1-question-examples]')?.textContent

    expect(questionText).toContain('He is a student.')
    expect(questionText).toContain('Is he a student?')
    expect(questionText).toContain('He is not a student.')
    expect(questionText).toContain('They are 20 years old.')
    expect(questionText).toContain('Are they 20 years old?')
    expect(questionText).toContain('They are not 20 years old.')
    expect(screen.getAllByText('not', { exact: true })).toHaveLength(2)
    expect(screen.getAllByText('not', { exact: true })[0]).toHaveClass('text-[#C13E50]')
    const arrows = container.querySelectorAll('[data-unit1-arrowhead-tangent="true"]')
    expect(arrows).toHaveLength(4)
    expect(container.querySelectorAll('marker[orient="auto"]')).toHaveLength(4)

    const { container: transformContainer } = renderRole('transform')
    const transformText = transformContainer.querySelector(
      '[data-unit1-transform-chain]'
    )?.textContent
    expect(transformText).toContain('I am Lucas.')
    expect(transformText).toContain('Are you Lucas?')
    expect(transformText).toContain('I am not Lucas.')
    expect(screen.getByText('En preguntas, el verbo va primero.')).toBeVisible()
    expect(screen.getByText('Ver las formas')).toBeVisible()
  })

  it('keeps the complete to-be reference behind the expandable control', () => {
    const { container } = renderRole('transform')
    const details = container.querySelector('[data-unit1-reference="to-be"]')
    expect(details).not.toHaveAttribute('open')

    fireEvent.click(screen.getByText('Ver las formas'))

    expect(details).toHaveAttribute('open')
    expect(details?.querySelectorAll('[data-unit1-reference-row]')).toHaveLength(5)
    expect(screen.getByText('He / She / It')).toBeVisible()
    expect(details?.querySelectorAll('tbody td')).toHaveLength(5)
  })

  it('uses Peter’s clean-shaven rust-shirt avatar for possessives and preserves all eight rows', () => {
    const { container } = renderRole('possessives')

    const visibleExamples = container.querySelector('[data-unit1-possessive-examples]')
    expect(visibleExamples).toHaveTextContent('My name is Peter.')
    expect(visibleExamples).toHaveTextContent('Her name is Ana.')
    expect(visibleExamples).toHaveTextContent('Their names are Peter and Ana.')
    expect(visibleExamples).toHaveTextContent('su (de ella)')
    expect(visibleExamples).toHaveTextContent('sus (de ellos)')
    expect(
      container.querySelector('[data-testid="unit1-image"][data-src*="peter-cutout-v2.webp"]')
    ).toBeInTheDocument()
    expect(container.querySelector('[data-testid="unit1-image"][data-src*="lucas"]')).toBeNull()

    fireEvent.click(screen.getByText('Ver todos los posesivos'))

    const rows = container.querySelectorAll('[data-unit1-possessive-row]')
    expect(rows).toHaveLength(8)
    expect(rows[1]).toHaveTextContent('You')
    expect(rows[6]).toHaveTextContent('You')
    expect(rows[1]).toHaveTextContent('Your')
    expect(rows[6]).toHaveTextContent('Your')
  })

  it('documents only the known facts from the existing Jake and Pete audio', () => {
    const { container } = renderRole('intro-audio-notes')

    expect(screen.getByText('Jake y Pete tienen 17 años.')).toBeVisible()
    expect(screen.getByText(/Jake es un estudiante nuevo/)).toBeVisible()
    expect(screen.getByText(/Jackson Ave, 6th/)).toBeVisible()
    expect(screen.getByText(/Pete está en la misma clase/)).toBeVisible()
    expect(screen.getByText(/8th/)).toBeVisible()
    expect(screen.getByText(/no dice la ocupación ni el teléfono de Smith/)).toBeVisible()
    expect(container.querySelector('audio')).toBeNull()
    expect(container.textContent).not.toContain('Smith es')
  })
})
