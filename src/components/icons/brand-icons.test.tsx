import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Facebook, Instagram, Linkedin, Twitter, Youtube } from './brand-icons'

describe('brand-icons', () => {
  const icons = { Facebook, Instagram, Linkedin, Twitter, Youtube }

  it.each(Object.entries(icons))('%s renders an svg with a non-empty path', (_name, Icon) => {
    const { container } = render(<Icon />)
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
    expect(svg?.getAttribute('fill')).toBe('currentColor')
    expect(svg?.getAttribute('aria-hidden')).toBe('true')

    const path = container.querySelector('path')
    expect(path).not.toBeNull()
    expect(path?.getAttribute('d')?.length ?? 0).toBeGreaterThan(0)
  })

  it('forwards className for sizing', () => {
    const { container } = render(<Facebook className="h-5 w-5" />)
    expect(container.querySelector('svg')?.getAttribute('class')).toContain('h-5 w-5')
  })
})
