import sanitize from 'sanitize-html'
import { processHtmlLinks } from '@/lib/utils'

/**
 * Sanitize user-authored HTML before injecting it via dangerouslySetInnerHTML.
 * Strips scripts/event handlers/unsafe markup (XSS) while keeping the rich
 * formatting authors expect, and makes links open safely in a new tab.
 *
 * Uses the pure-JS `sanitize-html` (htmlparser2) — NOT a DOM-based sanitizer —
 * so it never pulls jsdom into the server bundle. (jsdom via isomorphic-dompurify
 * broke /classroom SSR in production: ENOENT when bundled, require-of-ESM when
 * marked external.)
 */
const OPTIONS: sanitize.IOptions = {
  allowedTags: [
    ...sanitize.defaults.allowedTags,
    'img',
    'h1',
    'h2',
    'u',
    's',
    'del',
    'ins',
    'span',
    'figure',
    'figcaption',
    'mark',
    'sub',
    'sup',
  ],
  allowedAttributes: {
    ...sanitize.defaults.allowedAttributes,
    a: ['href', 'name', 'target', 'rel'],
    img: ['src', 'alt', 'title', 'width', 'height'],
    '*': ['class', 'style'],
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  // Editors frequently embed images inline as data URIs — allow them for <img> only.
  allowedSchemesByTag: { img: ['http', 'https', 'data'] },
  // Keep common, safe inline styles authors rely on; drop anything else.
  allowedStyles: {
    '*': {
      color: [/.*/],
      'background-color': [/.*/],
      'text-align': [/^(left|right|center|justify)$/],
      'font-weight': [/.*/],
      'font-style': [/.*/],
      'text-decoration': [/.*/],
      'font-size': [/.*/],
    },
  },
  // Force every link to open safely in a new tab (defence in depth alongside
  // processHtmlLinks).
  transformTags: {
    a: sanitize.simpleTransform('a', { target: '_blank', rel: 'noopener noreferrer' }),
  },
}

export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return ''
  return sanitize(processHtmlLinks(html), OPTIONS)
}
