import type { ArticleContent } from '@/lib/types/article-blocks'
import type { Block } from '@/types/course-builder'

type PublicContent =
  | { kind: 'empty' }
  | { kind: 'html'; html: string }
  | { kind: 'article'; content: ArticleContent }
  | { kind: 'course'; blocks: Block[] }

const articleTypes = new Set([
  'heading',
  'key-rule',
  'grammar-table',
  'examples-in-context',
  'callout',
  'divider',
])

/** Resolve the stored editor format without exposing JSON as article text. */
export function resolvePublicLibraryContent(raw: string | null): PublicContent {
  if (!raw?.trim()) return { kind: 'empty' }
  const text = raw.trim()
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return /^[\[{]/.test(text) ? { kind: 'empty' } : { kind: 'html', html: raw }
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { kind: 'empty' }
  const document = parsed as Record<string, unknown>
  if (Array.isArray(document.blocks) && document.blocks.length > 0) {
    if (
      !document.blocks.every(
        (block) => block && typeof block === 'object' && typeof block.type === 'string'
      )
    ) {
      return { kind: 'empty' }
    }
    if (document.blocks.some((block) => articleTypes.has(block.type))) {
      return { kind: 'article', content: document as unknown as ArticleContent }
    }
    return { kind: 'course', blocks: document.blocks as Block[] }
  }
  if (typeof document.html === 'string' && document.html.trim())
    return { kind: 'html', html: document.html }
  return { kind: 'empty' }
}
