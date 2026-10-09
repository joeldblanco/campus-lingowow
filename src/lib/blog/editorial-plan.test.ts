import { describe, expect, it } from 'vitest'
import { assertReviewedArticlesUnchanged, planBlogEditorialUpdate } from './editorial-plan'
import { blogEditorialUpdates } from './editorial-updates'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { sanitizeHtml } from '../sanitize-html'

const source = blogEditorialUpdates.map((update, i) => ({
  id: `r${i}`,
  slug: update.slug,
  type: 'ARTICLE',
  status: 'PUBLISHED',
  accessLevel: 'PUBLIC',
  updatedAt: new Date(0),
}))

describe('blog editorial migration', () => {
  it('refuses to overwrite editorial changes since review, while allowing view-count timestamps', () => {
    const original = [
      {
        ...source[0],
        title: 'Original',
        description: null,
        excerpt: null,
        thumbnailUrl: null,
        content: '<p>Original</p>',
      },
    ]
    const updates = [blogEditorialUpdates[0]]
    expect(() =>
      assertReviewedArticlesUnchanged(
        [{ ...original[0], updatedAt: new Date(100) }],
        original,
        updates
      )
    ).not.toThrow()
    expect(() =>
      assertReviewedArticlesUnchanged(
        [{ ...original[0], content: '<p>New author edit</p>' }],
        original,
        updates
      )
    ).toThrow('Article edited since review')
    expect(() => assertReviewedArticlesUnchanged(original, [], updates)).toThrow('Review snapshot')
  })
  it('covers all 19 public articles, ships existing illustrations and keeps all 20 travel phrases', () => {
    expect(blogEditorialUpdates).toHaveLength(19)
    for (const update of blogEditorialUpdates) {
      expect(existsSync(resolve('public', update.thumbnailUrl.slice(1)))).toBe(true)
      expect(sanitizeHtml(update.content)).toContain('<summary>Ver solución</summary>')
    }
    const travel = blogEditorialUpdates.find(
      (update) => update.slug === 'ingles-supervivencia-20-frases-viajar'
    )!
    const phraseList = travel.content.match(/<ol>([\s\S]*?)<\/ol>/)![1]
    expect(phraseList.match(/<li>/g)).toHaveLength(20)
  })
  it('preserves URLs and identity and produces editable nonempty content with practice answers', () => {
    const plan = planBlogEditorialUpdate(source, blogEditorialUpdates)
    expect(plan).toHaveLength(blogEditorialUpdates.length)
    plan.forEach((entry, i) => {
      expect(entry.slug).toBe(source[i].slug)
      expect(entry.id).toBe(source[i].id)
      expect(Object.keys(entry.data).sort()).toEqual([
        'content',
        'description',
        'excerpt',
        'thumbnailUrl',
        'title',
      ])
      const document = JSON.parse(entry.data.content)
      expect(document.blocks[0].format).toBe('html')
      expect(document.blocks[0].content).toContain('<details>')
      expect(document.blocks[0].content).toContain('<summary>Ver solución</summary>')
      expect(document.blocks[0].content).not.toContain('data-path-to-node')
    })
  })
  it('refuses missing, duplicate, restricted and unpublished resources', () => {
    expect(() => planBlogEditorialUpdate([], blogEditorialUpdates)).toThrow('Expected one resource')
    expect(() => planBlogEditorialUpdate([...source, source[0]], blogEditorialUpdates)).toThrow(
      'Expected one resource'
    )
    expect(() =>
      planBlogEditorialUpdate(source, [blogEditorialUpdates[0], blogEditorialUpdates[0]])
    ).toThrow('Duplicate editorial slug')
    for (const change of [{ accessLevel: 'PRIVATE' }, { status: 'DRAFT' }, { type: 'VIDEO' }]) {
      expect(() =>
        planBlogEditorialUpdate([{ ...source[0], ...change }], [blogEditorialUpdates[0]])
      ).toThrow('not a public published article')
    }
  })
})
