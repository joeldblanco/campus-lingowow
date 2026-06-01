import { describe, it, expect, vi } from 'vitest'

vi.mock('@prisma/client', () => ({
  LibraryResourceStatus: { PUBLISHED: 'PUBLISHED' },
}))

import { buildLibraryListWhere } from './library-list-where'

describe('buildLibraryListWhere', () => {
  it('always restricts to published resources', () => {
    expect(buildLibraryListWhere({})).toEqual({ status: 'PUBLISHED' })
  })

  it('scopes results to the saved resources of the given user', () => {
    expect(buildLibraryListWhere({ savedByUserId: 'user-1' })).toEqual({
      status: 'PUBLISHED',
      userSaves: { some: { userId: 'user-1' } },
    })
  })

  it('does not add a saved filter when savedByUserId is null', () => {
    expect(buildLibraryListWhere({ savedByUserId: null })).not.toHaveProperty('userSaves')
  })

  it('applies type, category, level and language filters', () => {
    expect(
      buildLibraryListWhere({
        type: 'VIDEO' as never,
        category: 'grammar',
        level: 'A1',
        language: 'en',
      })
    ).toEqual({
      status: 'PUBLISHED',
      type: 'VIDEO',
      category: { slug: 'grammar' },
      level: 'A1',
      language: 'en',
    })
  })

  it('builds an OR search across title, description and tags', () => {
    const where = buildLibraryListWhere({ search: 'verbs' })
    expect(where.OR).toEqual([
      { title: { contains: 'verbs', mode: 'insensitive' } },
      { description: { contains: 'verbs', mode: 'insensitive' } },
      { tags: { has: 'verbs' } },
    ])
  })
})
