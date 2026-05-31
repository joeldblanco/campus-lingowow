import DOMPurify from 'isomorphic-dompurify'
import { processHtmlLinks } from '@/lib/utils'

/**
 * Sanitize user-authored HTML before injecting it via dangerouslySetInnerHTML.
 * Strips scripts/event handlers/unsafe markup (XSS) while keeping the rich
 * formatting authors expect, and makes links open safely in a new tab.
 *
 * Mirrors the pattern already used on the public library page so classroom and
 * public rendering behave identically.
 */
export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return ''
  // Keep `target` so links opened by processHtmlLinks still open in a new tab
  // (DOMPurify strips `target` by default).
  return DOMPurify.sanitize(processHtmlLinks(html), { ADD_ATTR: ['target'] })
}
