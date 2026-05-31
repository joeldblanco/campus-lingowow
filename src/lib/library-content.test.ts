import { describe, it, expect } from 'vitest'
import { buildLibraryResourceContents } from './library-content'

const base = {
  id: 'res1',
  description: 'Una descripción de respaldo',
  excerpt: 'Un extracto',
  createdAt: new Date(0),
  updatedAt: new Date(0),
}

describe('buildLibraryResourceContents', () => {
  it('#164: preserves every Course-Builder block type (does not drop images/video)', () => {
    const content = JSON.stringify({
      version: 1,
      blocks: [
        { id: 'a', type: 'text', content: '<p>Hola</p>', order: 0 },
        { id: 'b', type: 'image', url: 'https://cdn/x.png', alt: 'x', order: 1 },
        { id: 'c', type: 'video', url: 'https://youtu.be/abc', order: 2 },
      ],
    })

    const result = buildLibraryResourceContents({ ...base, content })

    expect(result).toHaveLength(3)
    const image = result.find((c) => c.id === 'b')
    expect(image?.contentType).toBe('IMAGE')
    expect(image?.data.url).toBe('https://cdn/x.png')
    const video = result.find((c) => c.id === 'c')
    expect(video?.contentType).toBe('VIDEO')
  })

  it('#152: never renders raw JSON for unrecognized shapes; falls back to description', () => {
    const content = JSON.stringify({ foo: 'bar', secret: 12345 })

    const result = buildLibraryResourceContents({ ...base, content })

    expect(result).toHaveLength(1)
    const html = String(result[0].data.content)
    expect(html).not.toContain('foo')
    expect(html).not.toContain('bar')
    expect(html).not.toContain('secret')
    expect(html).toContain('Una descripción de respaldo')
  })

  it('renders a plain HTML string as a single text block', () => {
    const result = buildLibraryResourceContents({ ...base, content: '<p>Just HTML</p>' })
    expect(result).toHaveLength(1)
    expect(result[0].data.content).toBe('<p>Just HTML</p>')
    expect(result[0].contentType).toBe('RICH_TEXT')
  })

  it('uses the { html } property when present', () => {
    const content = JSON.stringify({ html: '<h2>Título</h2>' })
    const result = buildLibraryResourceContents({ ...base, content })
    expect(result).toHaveLength(1)
    expect(result[0].data.content).toBe('<h2>Título</h2>')
  })

  it('falls back to description when content is empty or null', () => {
    const empty = buildLibraryResourceContents({ ...base, content: '' })
    expect(empty[0].data.content).toContain('Una descripción de respaldo')

    const nullish = buildLibraryResourceContents({ ...base, content: null })
    expect(nullish[0].data.content).toContain('Una descripción de respaldo')
  })

  it('falls back to a placeholder when there is no content nor description', () => {
    const result = buildLibraryResourceContents({
      ...base,
      description: null,
      excerpt: null,
      content: null,
    })
    expect(result).toHaveLength(1)
    expect(String(result[0].data.content)).toContain('Sin contenido disponible')
  })

  it('#164: converts Article-format blocks to HTML (heading, divider) without leaking JSON', () => {
    const content = JSON.stringify({
      version: 1,
      blocks: [
        { id: 'h', type: 'heading', level: 'h2', content: 'Mi Encabezado', order: 0 },
        { id: 't', type: 'text', content: '<p>cuerpo</p>', order: 1 },
        { id: 'd', type: 'divider', order: 2 },
      ],
    })

    const result = buildLibraryResourceContents({ ...base, content })

    const joined = result.map((c) => String(c.data.content)).join('')
    expect(joined).toContain('<h2>Mi Encabezado</h2>')
    expect(joined).toContain('<hr />')
    expect(joined).not.toContain('"type"') // no raw JSON
    result.forEach((c) => expect(c.contentType).toBe('RICH_TEXT'))
  })

  it('does not dump a raw JSON object even when JSON is malformed', () => {
    // Starts like JSON but is invalid -> treated as markup, not an object dump.
    const result = buildLibraryResourceContents({ ...base, content: '{not valid json' })
    expect(result).toHaveLength(1)
    // It is the literal string, not a serialized object with quoted keys.
    expect(String(result[0].data.content)).toBe('{not valid json')
  })
})
