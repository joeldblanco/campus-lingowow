import { describe, it, expect } from 'vitest'
import { sanitizeHtml } from './sanitize-html'

describe('sanitizeHtml', () => {
  it('removes <script> tags (XSS)', () => {
    const out = sanitizeHtml('<p>ok</p><script>alert(1)</script>')
    expect(out).toContain('<p>ok</p>')
    expect(out.toLowerCase()).not.toContain('<script')
  })

  it('strips inline event handlers', () => {
    const out = sanitizeHtml('<img src="x" onerror="alert(1)" />')
    expect(out.toLowerCase()).not.toContain('onerror')
  })

  it('keeps safe formatting markup', () => {
    const out = sanitizeHtml('<strong>bold</strong> and <em>italic</em>')
    expect(out).toContain('<strong>bold</strong>')
    expect(out).toContain('<em>italic</em>')
  })

  it('makes links open in a new tab safely', () => {
    const out = sanitizeHtml('<a href="https://example.com">link</a>')
    expect(out).toContain('target="_blank"')
    expect(out).toContain('rel="noopener noreferrer"')
  })

  it('returns empty string for falsy input', () => {
    expect(sanitizeHtml('')).toBe('')
    expect(sanitizeHtml(null)).toBe('')
    expect(sanitizeHtml(undefined)).toBe('')
  })

  it('strips javascript: hrefs (XSS)', () => {
    const out = sanitizeHtml('<a href="javascript:alert(1)">x</a>')
    expect(out.toLowerCase()).not.toContain('javascript:')
  })

  it('keeps images but drops their event handlers', () => {
    const out = sanitizeHtml('<img src="https://e.com/a.png" onerror="alert(1)" alt="a" />')
    expect(out).toContain('src="https://e.com/a.png"')
    expect(out.toLowerCase()).not.toContain('onerror')
  })

  it('keeps safe inline styles authors use', () => {
    const out = sanitizeHtml('<span style="color: red">x</span>')
    expect(out).toContain('color')
  })
})
