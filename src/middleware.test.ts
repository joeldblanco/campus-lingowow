import { NextRequest } from 'next/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next-auth', () => ({
  default: () => ({ auth: (callback: (request: NextRequest) => Promise<Response>) => callback }),
}))
vi.mock('next-auth/jwt', () => ({ getToken: vi.fn().mockResolvedValue(null) }))

import middleware from './middleware'

describe('middleware LingoFlow API contract', () => {
  it('returns JSON 401 for an unauthenticated generate request instead of redirecting', async () => {
    const response = await middleware(
      new NextRequest('http://localhost/api/admin/lingoflow/generate', { method: 'POST' }),
      undefined as never
    )

    expect(response?.status).toBe(401)
    expect(response?.headers.get('content-type')).toContain('application/json')
    await expect(response?.json()).resolves.toEqual({ error: 'No autenticado' })
  })
})
