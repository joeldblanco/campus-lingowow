import { LibraryResourceStatus, type LibraryResourceType } from '@prisma/client'

export interface LibraryListFilters {
  type?: LibraryResourceType | null
  category?: string | null
  level?: string | null
  language?: string | null
  search?: string | null
  /**
   * When set, restrict results to resources this user has saved (favorites).
   * Leave null/undefined for the normal, unfiltered listing.
   */
  savedByUserId?: string | null
}

/**
 * Builds the Prisma `where` clause for the public library listing, including the
 * optional "saved/favorites" filter (Trello card "Sección de favoritos para los
 * recursos"). Pure function so the filtering logic is unit-testable.
 */
export function buildLibraryListWhere(filters: LibraryListFilters): Record<string, unknown> {
  const where: Record<string, unknown> = {
    status: LibraryResourceStatus.PUBLISHED,
  }

  if (filters.type) where.type = filters.type
  if (filters.category) where.category = { slug: filters.category }
  if (filters.level) where.level = filters.level
  if (filters.language) where.language = filters.language
  if (filters.search) {
    where.OR = [
      { title: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } },
      { tags: { has: filters.search } },
    ]
  }
  if (filters.savedByUserId) {
    where.userSaves = { some: { userId: filters.savedByUserId } }
  }

  return where
}
