import { describe, expect, it, vi } from 'vitest'
import { publicRoutes } from '@/routes'

const redirect = vi.hoisted(() => vi.fn())
vi.mock('next/navigation', () => ({ redirect }))
import BlogPage from './page'

describe('public blog entry', () => {
  it('is reachable without signing in and leads to the public library', async () => {
    expect(publicRoutes).toContain('/blog')
    await BlogPage({ searchParams: Promise.resolve({ search: 'inglés', category: 'viajes' }) })
    expect(redirect).toHaveBeenCalledWith('/library?search=ingl%C3%A9s&category=viajes')
  })
})
