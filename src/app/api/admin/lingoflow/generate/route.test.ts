import { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  getLingoFlowReadModel: vi.fn(),
  createLingoFlowDraft: vi.fn(),
  rateLimit: vi.fn(),
}))

vi.mock('@/auth', () => ({ auth: mocks.auth }))
vi.mock('@/lib/lingoflow/read-model', () => ({ getLingoFlowReadModel: mocks.getLingoFlowReadModel }))
vi.mock('@/lib/lingoflow/gemini', () => ({
  createLingoFlowDraft: mocks.createLingoFlowDraft,
  LingoFlowAiUnavailableError: class LingoFlowAiUnavailableError extends Error {},
  LingoFlowAiResponseError: class LingoFlowAiResponseError extends Error {},
}))
vi.mock('@/lib/rate-limit', () => ({
  rateLimit: mocks.rateLimit,
  getRateLimitHeaders: () => ({ 'X-RateLimit-Remaining': '4', 'X-RateLimit-Reset': '60' }),
}))

import { POST } from './route'

const request = (body: unknown) => new NextRequest('http://localhost/api/admin/lingoflow/generate', {
  method: 'POST',
  body: JSON.stringify(body),
  headers: { 'content-type': 'application/json' },
})

const malformedRequest = () => new NextRequest('http://localhost/api/admin/lingoflow/generate', {
  method: 'POST',
  body: '{',
  headers: { 'content-type': 'application/json' },
})

describe('POST /api/admin/lingoflow/generate', () => {
  beforeEach(() => {
    process.env.LINGOFLOW_AI_ENABLED = 'true'
    mocks.rateLimit.mockReturnValue({ success: true, remaining: 4, resetIn: 60_000 })
    mocks.getLingoFlowReadModel.mockResolvedValue({ activeStudents: 4, targetStudents: 30, gap: 26, progressPercent: 13.3 })
    mocks.createLingoFlowDraft.mockResolvedValue({ isDraft: true, title: 'Título', content: 'Contenido', safetyNote: 'Borrador sin envío.' })
  })

  afterEach(() => vi.clearAllMocks())

  it('returns 401 without a session', async () => {
    mocks.auth.mockResolvedValue(null)
    expect((await POST(request({ mode: 'growth-analysis' }))).status).toBe(401)
  })

  it('returns 403 for a non-admin session', async () => {
    mocks.auth.mockResolvedValue({ user: { id: 'teacher', roles: ['TEACHER'] } })
    expect((await POST(request({ mode: 'growth-analysis' }))).status).toBe(403)
  })

  it('accepts only the closed request body for an admin and derives metrics server-side', async () => {
    mocks.auth.mockResolvedValue({ user: { id: 'admin', roles: ['ADMIN'] } })
    const response = await POST(request({ mode: 'growth-analysis' }))
    expect(response.status).toBe(200)
    expect(mocks.getLingoFlowReadModel).toHaveBeenCalledOnce()
    expect(mocks.createLingoFlowDraft).toHaveBeenCalledWith('growth-analysis', expect.objectContaining({ activeStudents: 4 }))

    expect((await POST(request({ mode: 'growth-analysis', activeStudents: 999 }))).status).toBe(400)
  })

  it('returns 400 for malformed JSON', async () => {
    mocks.auth.mockResolvedValue({ user: { id: 'admin-json', roles: ['ADMIN'] } })
    expect((await POST(malformedRequest())).status).toBe(400)
  })

  it('returns 429 when the limiter rejects the request', async () => {
    mocks.auth.mockResolvedValue({ user: { id: 'admin-rate', roles: ['ADMIN'] } })
    mocks.rateLimit.mockReturnValue({ success: false, remaining: 0, resetIn: 60_000 })
    expect((await POST(request({ mode: 'growth-analysis' }))).status).toBe(429)
  })

  it('returns 503 when the AI kill switch is disabled', async () => {
    process.env.LINGOFLOW_AI_ENABLED = 'false'
    mocks.auth.mockResolvedValue({ user: { id: 'admin-disabled', roles: ['ADMIN'] } })
    expect((await POST(request({ mode: 'growth-analysis' }))).status).toBe(503)
  })

  it('returns 502 when Gemini fails or returns an invalid response', async () => {
    mocks.auth.mockResolvedValue({ user: { id: 'admin-ai', roles: ['ADMIN'] } })
    mocks.createLingoFlowDraft.mockRejectedValue(new Error('invalid Gemini response'))
    expect((await POST(request({ mode: 'growth-analysis' }))).status).toBe(502)
  })
})
