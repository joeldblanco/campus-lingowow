import { mapBlockTypeToContentType } from '@/lib/content-mapper'
import type { BlockType } from '@/types/course-builder'

/**
 * Shared logic to turn a LibraryResource's stored `content` into the list of
 * synthetic "content" blocks consumed by the lesson viewer
 * (`mapContentToBlock` -> `BlockPreview`).
 *
 * This fixes two classroom bugs:
 *  - #164: articles rendered incompletely because only `text` blocks were kept.
 *          We now emit one synthetic content per block, preserving every block
 *          type (images, video, grammar, etc.).
 *  - #152: unrecognized JSON shapes were rendered verbatim ("información raw").
 *          We never emit raw JSON; unknown shapes fall back to the
 *          description/excerpt.
 */

// Block types that only exist in the "Article" editor format. Their presence
// tells us the stored blocks are ArticleBlocks (not Course-Builder Blocks).
const ARTICLE_EXCLUSIVE_TYPES = [
  'heading',
  'key-rule',
  'grammar-table',
  'examples-in-context',
  'callout',
  'divider',
]

export interface LibraryResourceContentSource {
  id: string
  description?: string | null
  excerpt?: string | null
  content?: string | null
  createdAt: Date
  updatedAt: Date
}

export interface SyntheticContent {
  id: string
  contentType: string
  order: number
  data: Record<string, unknown>
  lessonId: string
  parentId: string | null
  children: SyntheticContent[]
  createdAt: Date
  updatedAt: Date
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/** Wrap plain text in a paragraph, escaping it; HTML passes through untouched. */
function textToHtml(value: string): string {
  if (!value) return ''
  // Looks like it already contains markup -> trust it (it is sanitized at render).
  if (value.includes('<')) return value
  return `<p>${escapeHtml(value)}</p>`
}

/**
 * Convert a single ArticleBlock (from the rich Article editor) into an HTML
 * snippet so it renders inside the classroom's text-block previewer. Returns an
 * empty string for blocks we cannot represent (never raw JSON).
 */
function articleBlockToHtml(block: Record<string, unknown>): string {
  const type = typeof block.type === 'string' ? block.type : ''
  const content = typeof block.content === 'string' ? block.content : ''

  switch (type) {
    case 'text':
      return textToHtml(content)
    case 'heading': {
      const level = block.level === 'h3' || block.level === 'h4' ? block.level : 'h2'
      return content ? `<${level}>${escapeHtml(content)}</${level}>` : ''
    }
    case 'callout':
    case 'key-rule': {
      const title = typeof block.title === 'string' ? block.title : ''
      const description = typeof block.description === 'string' ? block.description : ''
      const items = Array.isArray(block.items) ? (block.items as unknown[]) : []
      const parts: string[] = []
      if (title) parts.push(`<strong>${escapeHtml(title)}</strong>`)
      if (content) parts.push(textToHtml(content))
      if (description) parts.push(textToHtml(description))
      if (items.length) {
        const lis = items
          .filter((i): i is string => typeof i === 'string' && i.length > 0)
          .map((i) => `<li>${escapeHtml(i)}</li>`)
          .join('')
        if (lis) parts.push(`<ul>${lis}</ul>`)
      }
      return parts.length ? `<div>${parts.join('')}</div>` : ''
    }
    case 'examples-in-context': {
      const title = typeof block.title === 'string' ? block.title : ''
      const examples = Array.isArray(block.examples) ? (block.examples as Record<string, unknown>[]) : []
      const lis = examples
        .map((ex) => (typeof ex.sentence === 'string' ? `<li>${escapeHtml(ex.sentence)}</li>` : ''))
        .join('')
      const parts: string[] = []
      if (title) parts.push(`<strong>${escapeHtml(title)}</strong>`)
      if (lis) parts.push(`<ul>${lis}</ul>`)
      return parts.length ? `<div>${parts.join('')}</div>` : ''
    }
    case 'grammar-table': {
      const columns = Array.isArray(block.columns) ? (block.columns as Record<string, unknown>[]) : []
      const rows = Array.isArray(block.rows) ? (block.rows as Record<string, unknown>[]) : []
      if (!columns.length || !rows.length) return ''
      const head = columns
        .map((c) => `<th>${escapeHtml(typeof c.header === 'string' ? c.header : '')}</th>`)
        .join('')
      const body = rows
        .map((row) => {
          const cells = (row.cells || {}) as Record<string, unknown>
          const tds = columns
            .map((c) => {
              const key = typeof c.id === 'string' ? c.id : ''
              const value = typeof cells[key] === 'string' ? (cells[key] as string) : ''
              return `<td>${escapeHtml(value)}</td>`
            })
            .join('')
          return `<tr>${tds}</tr>`
        })
        .join('')
      return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`
    }
    case 'image': {
      const url = typeof block.url === 'string' ? block.url : ''
      const alt = typeof block.alt === 'string' ? block.alt : ''
      return url ? `<img src="${escapeHtml(url)}" alt="${escapeHtml(alt)}" />` : ''
    }
    case 'video': {
      const url = typeof block.url === 'string' ? block.url : ''
      return url ? `<p><a href="${escapeHtml(url)}">${escapeHtml(url)}</a></p>` : ''
    }
    case 'divider':
      return '<hr />'
    default:
      return ''
  }
}

/**
 * Build the synthetic content list for a library resource. Pure and
 * deterministic so it can be unit tested independently of Prisma.
 */
export function buildLibraryResourceContents(
  resource: LibraryResourceContentSource
): SyntheticContent[] {
  const make = (
    id: string,
    order: number,
    data: Record<string, unknown>,
    contentType = 'RICH_TEXT'
  ): SyntheticContent => ({
    id,
    contentType,
    order,
    data,
    lessonId: resource.id,
    parentId: null,
    children: [],
    createdAt: resource.createdAt,
    updatedAt: resource.updatedAt,
  })

  const fallback = (): SyntheticContent[] => {
    const text = resource.description || resource.excerpt || 'Sin contenido disponible'
    return [make(`content-${resource.id}-fallback`, 0, { type: 'text', content: textToHtml(text) })]
  }

  const raw = resource.content
  if (!raw || !raw.trim()) return fallback()

  const trimmed = raw.trim()
  const looksLikeJson = trimmed.startsWith('{') || trimmed.startsWith('[')

  if (looksLikeJson) {
    try {
      const parsed = JSON.parse(trimmed)

      if (parsed && Array.isArray(parsed.blocks) && parsed.blocks.length > 0) {
        const blocks = parsed.blocks as Record<string, unknown>[]
        const isArticleFormat = blocks.some(
          (b) => typeof b.type === 'string' && ARTICLE_EXCLUSIVE_TYPES.includes(b.type)
        )

        if (isArticleFormat) {
          const contents = blocks
            .map((b, i) => ({ html: articleBlockToHtml(b), index: i, id: b.id }))
            .filter((c) => c.html.length > 0)
            .map((c) =>
              make(typeof c.id === 'string' ? c.id : `article-${resource.id}-${c.index}`, c.index, {
                type: 'text',
                content: c.html,
              })
            )
          return contents.length ? contents : fallback()
        }

        // Course-Builder blocks: keep every block, preserving its own type so the
        // viewer renders images/video/grammar/etc. (not just text).
        return blocks.map((b, i) => {
          const blockType = (typeof b.type === 'string' ? b.type : 'text') as BlockType
          const order = typeof b.order === 'number' ? b.order : i
          const id = typeof b.id === 'string' ? b.id : `block-${resource.id}-${i}`
          return make(id, order, b, mapBlockTypeToContentType(blockType))
        })
      }

      if (parsed && typeof parsed.html === 'string' && parsed.html.trim()) {
        return [make(`content-${resource.id}-html`, 0, { type: 'text', content: parsed.html })]
      }

      // Parsed JSON but no recognizable content shape -> never render raw JSON.
      return fallback()
    } catch {
      // Not valid JSON; fall through and treat as raw HTML markup.
    }
  }

  // Plain HTML / markup string.
  return [make(`content-${resource.id}-raw`, 0, { type: 'text', content: raw })]
}
