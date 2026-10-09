import { describe, expect, it } from 'vitest'
import { resolvePublicLibraryContent } from './public-library-content'

describe('public library content', () => {
  it('never prints an empty editor document as JSON', () => {
    expect(resolvePublicLibraryContent('{"blocks":[],"version":1}')).toEqual({ kind: 'empty' })
  })
  it('handles null, unknown and malformed documents without leaking their payload', () => {
    for (const value of [null, '', 'null', '{"secret":"value"}', '{"blocks":', '[1,2]']) {
      expect(resolvePublicLibraryContent(value)).toEqual({ kind: 'empty' })
    }
  })
  it('preserves legacy HTML and wrapped HTML', () => {
    expect(resolvePublicLibraryContent('<p>Hola</p>')).toEqual({
      kind: 'html',
      html: '<p>Hola</p>',
    })
    expect(resolvePublicLibraryContent('{"html":"<p>Hola</p>"}')).toEqual({
      kind: 'html',
      html: '<p>Hola</p>',
    })
  })
  it('keeps article and course builder formats distinct, including mixed media', () => {
    const article = {
      version: 1,
      blocks: [{ id: 'h', type: 'heading', content: 'Hola', level: 'h2' }],
    }
    expect(resolvePublicLibraryContent(JSON.stringify(article)).kind).toBe('article')
    const course = {
      blocks: [
        { id: 't', type: 'text', content: '<p>Hola</p>', format: 'html' },
        { id: 'v', type: 'video', url: '/video.mp4' },
      ],
    }
    const result = resolvePublicLibraryContent(JSON.stringify(course))
    expect(result.kind).toBe('course')
    if (result.kind === 'course') expect(result.blocks).toHaveLength(2)
  })
})
