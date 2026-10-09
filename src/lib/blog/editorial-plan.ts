import type { BlogEditorialUpdate } from './editorial-updates'

export interface EditorialSource {
  id: string
  slug: string
  updatedAt: string | Date
  type: string
  status: string
  accessLevel: string
}

interface ReviewedArticleSource extends EditorialSource {
  title: string
  description: string | null
  excerpt: string | null
  content: string | null
  thumbnailUrl: string | null
}

/** Page views can change updatedAt; compare the author-edited fields to the review snapshot. */
export function assertReviewedArticlesUnchanged(
  current: ReviewedArticleSource[],
  reviewed: ReviewedArticleSource[],
  updates: BlogEditorialUpdate[]
) {
  for (const update of updates) {
    const original = reviewed.filter((resource) => resource.slug === update.slug)
    const live = current.filter((resource) => resource.slug === update.slug)
    if (original.length !== 1 || live.length !== 1 || original[0].id !== live[0].id) {
      throw new Error(`Review snapshot does not identify one article: ${update.slug}`)
    }
    for (const field of ['title', 'description', 'excerpt', 'content', 'thumbnailUrl'] as const) {
      if (original[0][field] !== live[0][field]) {
        throw new Error(`Article edited since review: ${update.slug} (${field})`)
      }
    }
  }
}

export function planBlogEditorialUpdate(
  resources: EditorialSource[],
  updates: BlogEditorialUpdate[]
) {
  const seen = new Set<string>()
  return updates.map((update) => {
    if (seen.has(update.slug)) throw new Error(`Duplicate editorial slug: ${update.slug}`)
    seen.add(update.slug)
    const matches = resources.filter((resource) => resource.slug === update.slug)
    if (matches.length !== 1)
      throw new Error(`Expected one resource for ${update.slug}; found ${matches.length}`)
    const resource = matches[0]
    if (
      resource.type !== 'ARTICLE' ||
      resource.status !== 'PUBLISHED' ||
      resource.accessLevel !== 'PUBLIC'
    ) {
      throw new Error(`Resource is not a public published article: ${update.slug}`)
    }
    if (!update.content.trim()) throw new Error(`Empty editorial content: ${update.slug}`)
    return {
      id: resource.id,
      slug: resource.slug,
      expectedUpdatedAt: new Date(resource.updatedAt),
      data: {
        title: update.title,
        description: update.description,
        excerpt: update.excerpt,
        thumbnailUrl: update.thumbnailUrl,
        // Keep the document editable in the existing resource builder.
        content: JSON.stringify({
          version: 1,
          blocks: [
            {
              id: `editorial-${resource.id}`,
              type: 'text',
              order: 0,
              format: 'html',
              content: update.content.trim(),
            },
          ],
        }),
      },
    }
  })
}
