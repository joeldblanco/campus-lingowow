import { render, screen, cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PublicResourceContent } from './public-resource-content'

vi.mock('@/components/admin/course-builder/lesson-builder/block-preview', () => ({
  BlockPreview: ({ block }: { block: { id: string } }) => <div>Block {block.id}</div>,
}))
afterEach(cleanup)

describe('public article reader', () => {
  it('renders editable HTML text documents without classroom framing', () => {
    render(
      <PublicResourceContent
        content={JSON.stringify({
          blocks: [
            {
              id: 't',
              type: 'text',
              format: 'html',
              content: '<h2>Respuesta breve</h2><p>Apellido.</p>',
            },
          ],
        })}
      />
    )
    expect(screen.getByRole('heading', { name: 'Respuesta breve' })).toBeInTheDocument()
    expect(screen.getByText('Apellido.')).toBeInTheDocument()
    expect(screen.queryByText('Block t')).not.toBeInTheDocument()
  })
  it('shows a readable empty state instead of editor JSON', () => {
    const { container } = render(<PublicResourceContent content={'{"blocks":[],"version":1}'} />)
    expect(screen.getByText('Este artículo aún no tiene contenido')).toBeInTheDocument()
    expect(container.textContent).not.toContain('"blocks"')
  })
  it('renders a practice with a keyboard-accessible answer and removes executable markup', () => {
    const { container } = render(
      <PublicResourceContent
        content={
          '<h2>Practica</h2><p>¿Qué significa surname?</p><details><summary>Ver respuesta</summary><p>Apellido.</p></details><script>alert(1)</script><img src="/example.png" onerror="alert(1)">'
        }
      />
    )
    expect(screen.getByText('Ver respuesta').tagName).toBe('SUMMARY')
    expect(container.querySelector('details')).not.toHaveAttribute('open')
    expect(screen.getByText('Apellido.')).toBeInTheDocument()
    expect(container.querySelector('script')).toBeNull()
    expect(container.querySelector('img')).not.toHaveAttribute('onerror')
  })
  it('preserves structured headings and every course media block', () => {
    const { rerender } = render(
      <PublicResourceContent
        content={JSON.stringify({
          version: 1,
          blocks: [{ id: 'h', type: 'heading', level: 'h2', content: 'Ejemplos' }],
        })}
      />
    )
    expect(screen.getByRole('heading', { name: 'Ejemplos' })).toBeInTheDocument()
    rerender(
      <PublicResourceContent
        content={JSON.stringify({
          blocks: [
            { id: 'a', type: 'audio', url: '/a.mp3' },
            { id: 'v', type: 'video', url: '/v.mp4' },
          ],
        })}
      />
    )
    expect(screen.getByText('Block a')).toBeInTheDocument()
    expect(screen.getByText('Block v')).toBeInTheDocument()
  })
})
